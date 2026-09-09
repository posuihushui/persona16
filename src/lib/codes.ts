import type { TestPack } from "@/lib/types";

/**
 * 类型码的分组与轴。
 *
 * 16 个类型平铺成一列，用户只能从头扫到尾。按第一条和第四条轴分成四组之后，
 * 每组四个，先定位自己那一组再在四个里挑，认知成本低一个量级。
 *
 * 分组规则完全从内容包推导：取 codeOrder 的第一位和第四位做组，
 * 和 TypeGrid 的行划分一致，所以两个页面看到的是同一种分法。
 * 不认识任何具体的类型码，换一个 dichotomy 内容包照样成立。
 */

export type CodeGroup = {
  /** 组标识，例如 "EJ" */
  key: string;
  /** 组里两个字母 */
  letters: string[];
  /** 两个字母对应的中文名，用来给这一组起标题 */
  names: string[];
  codes: string[];
};

function polesOf(pack: TestPack, id: string): string[] {
  const dim = pack.scoring.dimensions.find((d) => d.id === id);
  if (!dim) return [];
  const rest = Object.keys(dim.poles).filter((p) => p !== dim.positivePole);
  return [dim.positivePole, ...rest];
}

function nameOf(pack: TestPack, id: string, letter: string): string {
  return pack.scoring.dimensions.find((d) => d.id === id)?.poles[letter]?.name ?? letter;
}

/** 每条轴的两个极，用于筛选条。顺序跟着 codeOrder。 */
export function axisLetters(pack: TestPack): string[][] {
  const order = pack.scoring.codeOrder ?? pack.scoring.dimensions.map((d) => d.id);
  return order.map((id) => polesOf(pack, id)).filter((poles) => poles.length === 2);
}

/** 按第一条与第四条轴分组。分不出四条轴时返回一个「全部」组，页面照常能渲染。 */
export function groupCodes(pack: TestPack, codes: string[]): CodeGroup[] {
  const order = pack.scoring.codeOrder ?? pack.scoring.dimensions.map((d) => d.id);
  if (order.length !== 4) return [{ key: "all", letters: [], names: [], codes }];

  const first = polesOf(pack, order[0]);
  const last = polesOf(pack, order[3]);
  if (first.length !== 2 || last.length !== 2) return [{ key: "all", letters: [], names: [], codes }];

  const groups: CodeGroup[] = [];
  for (const a of first) {
    for (const b of last) {
      groups.push({
        key: `${a}${b}`,
        letters: [a, b],
        names: [nameOf(pack, order[0], a), nameOf(pack, order[3], b)],
        // 类型码里这两位分别在第 1 位和第 4 位，按 codeOrder 的下标取
        codes: codes.filter((code) => code[0] === a && code[3] === b),
      });
    }
  }
  return groups.filter((group) => group.codes.length > 0);
}
