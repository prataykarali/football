import { demoTimerMethods } from './demoTimers.js';
import { realTimerMethods } from './realTimers.js';

export const liveTimerMethods = {
  ...realTimerMethods,
  ...demoTimerMethods,
};
