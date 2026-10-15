/** Raised when a calculator receives an out-of-range input. */
export class InvalidArgumentError extends RangeError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidArgumentError";
  }
}

/** Ensures a value is a finite number strictly greater than zero. */
export function assertPositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new InvalidArgumentError(`${name} must be greater than zero, got ${value}.`);
  }
}

/** Ensures a value is a finite number greater than or equal to zero. */
export function assertNonNegative(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new InvalidArgumentError(`${name} must be zero or greater, got ${value}.`);
  }
}

/** Ensures a value is a whole number. */
export function assertInteger(value: number, name: string): void {
  if (!Number.isInteger(value)) {
    throw new InvalidArgumentError(`${name} must be a whole number, got ${value}.`);
  }
}
