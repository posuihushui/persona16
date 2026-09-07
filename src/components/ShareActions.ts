/** 只分享公开类型地址，个人结果、订单与找回码不进入链接。 */
export function publicTypePath(slug: string, code: string): string {
  return `/t/${encodeURIComponent(slug)}/type/${encodeURIComponent(code)}`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 老 WebView、非安全上下文或权限拒绝时，继续用传统复制。
  }
  const field = document.createElement("textarea");
  field.value = text;
  field.readOnly = true;
  field.style.position = "fixed";
  field.style.top = "0";
  field.style.left = "-9999px";
  field.style.fontSize = "16px";
  const previous = document.activeElement;
  document.body.appendChild(field);
  try {
    field.select();
    field.setSelectionRange(0, text.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    field.remove();
    if (previous instanceof HTMLElement) previous.focus();
  }
}
