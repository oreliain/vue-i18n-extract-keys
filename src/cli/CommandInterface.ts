export default interface CommandInterface {
  execute(): void;
  execute(): Promise<void>;
  verbose(message: any): void;
  debug(message: any): void;
  error(message: any): void;
  success(message: any): void;
}
