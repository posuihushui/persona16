import Link from "next/link";
import { TypeArt } from "@/components/TypeArt";
import type { TestPack } from "@/lib/types";

/**
 * 类型矩阵。目录页的地图。
 *
 * 取代扁平的标签列表。16 个标签排成一行行，用户只能一个个读；排成矩阵之后，
 * 行和列各自有含义，用户可以先定位自己在哪一行，再在四个里挑，认知成本低得多。
 *
 * 格子里只有主视觉和类型码，没有中文名。名字和那句话在下面的目录里。
 * 两处都放会让地图和目录长得一模一样——它们本来就是同一批类型的两种排法，
 * 视觉上再不分开，整页就成了把 16 个类型倒了两遍。
 * 地图管「我在哪一格」，目录管「这一格是什么」，各自只做一件事。
 *
 * 行列的划分完全从内容包推导：第一和第四个维度做行，第二和第三个维度做列。
 * 任何 dichotomy 内容包都适用，不写死 16 型的排布。
 */

function combos(poles: string[][]): string[][] {
  return poles.reduce<string[][]>(
    (acc, list) => acc.flatMap((prefix) => list.map((p) => [...prefix, p])),
    [[]],
  );
}

export function TypeGrid({ pack }: { pack: TestPack }) {
  const order = pack.scoring.codeOrder ?? pack.scoring.dimensions.map((d) => d.id);
  if (order.length !== 4) return null;

  const dimOf = (id: string) => pack.scoring.dimensions.find((d) => d.id === id);
  // 每个维度的极按 positivePole 在前排列，保证顺序稳定
  const polesOf = (id: string) => {
    const dim = dimOf(id);
    if (!dim) return [];
    const rest = Object.keys(dim.poles).filter((p) => p !== dim.positivePole);
    return [dim.positivePole, ...rest];
  };

  const rowKeys = combos([polesOf(order[0]), polesOf(order[3])]);
  const colKeys = combos([polesOf(order[1]), polesOf(order[2])]);

  /** 按行列的四个字母，按 codeOrder 拼回完整类型码。 */
  const codeFor = (row: string[], col: string[]) => {
    const letters: Record<string, string> = {
      [order[0]]: row[0],
      [order[3]]: row[1],
      [order[1]]: col[0],
      [order[2]]: col[1],
    };
    return order.map((id) => letters[id]).join("");
  };

  const colAxis = [dimOf(order[1])?.name, dimOf(order[2])?.name].filter(Boolean).join(" · ");
  const rowAxis = [dimOf(order[0])?.name, dimOf(order[3])?.name].filter(Boolean).join(" · ");

  return (
    <div className="type-map">
      {/* 轴名写成两行文字，不用竖排。竖排要靠 writing-mode 或旋转，老内核上容易错位 */}
      <p className="type-map-axis">
        <span>列</span>
        {colAxis}
      </p>
      <div className="type-grid-wrap">
        <div className="type-grid">
          <span className="type-grid-corner" aria-hidden="true" />
          {colKeys.map((col) => (
            <span className="type-grid-head" key={col.join("")}>
              {col.join("")}
            </span>
          ))}

          {/* 全部单元格都是网格的直接子元素，行头也算一个格 */}
          {rowKeys.flatMap((row) => [
            <span className="type-grid-head" key={`h-${row.join("")}`}>
              {row.join("")}
            </span>,
            ...colKeys.map((col) => {
              const code = codeFor(row, col);
              const doc = pack.results[code];
              if (!doc) return <span key={code} className="type-cell is-empty" />;
              return (
                <Link
                  key={code}
                  href={`/t/${pack.meta.slug}/type/${code}`}
                  className="type-cell"
                  // 格子里没有中文名，链接文字只剩类型码，读屏时补上名字
                  aria-label={`${code} ${doc.name}`}
                >
                  <TypeArt code={code} size={60} className="cell-art" />
                  <b>{code}</b>
                </Link>
              );
            }),
          ])}
        </div>
      </div>
      <p className="type-map-axis is-foot">
        <span>行</span>
        {rowAxis}
      </p>
    </div>
  );
}
