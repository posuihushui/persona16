import assert from "node:assert/strict";
import test from "node:test";
import { copyText, publicTypePath } from "../src/components/ShareActions.ts";

test("分享目的地只接受公开类型路径，并编码路径字符", () => {
  assert.equal(publicTypePath("persona16", "INFP"), "/t/persona16/type/INFP");
  assert.equal(publicTypePath("a/b", "I?code=x"), "/t/a%2Fb/type/I%3Fcode%3Dx");
});

test("复制兼容安全上下文、旧内核和拒绝授权，并恢复页面焦点", async (t) => {
  const originals = new Map(["navigator", "document", "HTMLElement"].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  t.after(() => {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  });
  const url = "https://example.test/t/persona16/type/INFP";
  for (const scenario of ["modern", "legacy", "denied", "unsupported", "throws"] as const) {
    const state = { copied: "", appended: false, removed: false, focused: false, selected: false };
    class FocusTarget { focus() { state.focused = true; } }
    const field = {
      value: "", readOnly: false, style: {},
      select() { state.selected = true; },
      setSelectionRange(start: number, end: number) { assert.equal(start, 0); assert.equal(end, url.length); },
      remove() { state.removed = true; },
    };
    const document = {
      activeElement: new FocusTarget(),
      createElement(tag: string) { assert.equal(tag, "textarea"); return field; },
      body: { appendChild() { state.appended = true; } },
      execCommand(command: string) {
        assert.equal(command, "copy");
        assert.equal(field.value, url);
        assert.equal(state.selected, true);
        if (scenario === "throws") throw new Error("disabled");
        return scenario !== "unsupported";
      },
    };
    const navigator = scenario === "legacy" ? {} : { clipboard: {
      async writeText(value: string) {
        if (scenario !== "modern") throw new Error("permission denied");
        state.copied = value;
      },
    } };
    for (const [key, value] of Object.entries({ navigator, document, HTMLElement: FocusTarget })) {
      Object.defineProperty(globalThis, key, { configurable: true, value });
    }
    const copied = await copyText(url);
    assert.equal(copied, !["unsupported", "throws"].includes(scenario), scenario);
    if (scenario === "modern") {
      assert.equal(state.copied, url);
      assert.equal(state.appended, false);
    } else {
      assert.equal(state.removed, true, scenario);
      assert.equal(state.focused, true, scenario);
    }
  }
});
