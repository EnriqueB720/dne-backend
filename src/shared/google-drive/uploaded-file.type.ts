/// <reference types="multer" />

/**
 * The object multer hands to `@UploadedFile()`.
 *
 * `Express.Multer.File` only exists because @types/multer augments the
 * global Express namespace from inside a module. That augmentation is
 * pulled in automatically by the compiler, but an editor's TS server can
 * miss it and report `Namespace 'global.Express' has no exported member
 * 'Multer'` even while `tsc` is perfectly happy. The triple-slash
 * reference above makes the dependency explicit so every program that
 * touches this file loads the declaration.
 *
 * Everything else imports this alias rather than the global, so if the
 * multer typings ever move again there is exactly one line to change.
 *
 * Named `MulterFile`, not `UploadedFile` — that name is already Nest's
 * `@UploadedFile()` parameter decorator, and the controller needs both.
 */
export type MulterFile = Express.Multer.File;
