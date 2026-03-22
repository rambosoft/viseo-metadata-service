import type { ClockPort } from "../ports/shared/clock-port.js";

export class SystemClock implements ClockPort {
  public now(): Date {
    return new Date();
  }
}
