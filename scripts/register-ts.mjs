import { register } from "node:module";
import { pathToFileURL } from "node:url";

// 让运维脚本可以直接 import 应用里的 TypeScript 源码
register("./ts-resolve.mjs", pathToFileURL(`${import.meta.dirname}/`));
