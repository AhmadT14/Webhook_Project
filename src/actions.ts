import { Payload } from "./worker.js";

export type ActionsResultPayload = { student: string; result: number };
export const actions = ["average", "sum", "max", "min"];

export async function gradesAverage(payload: Payload) {
  const grades: number[] = payload.grades;
  let sum = 0;
  for (let i = 0; i < grades.length; i++) {
    sum += grades[i];
  }
  return sum / grades.length;
}

export async function gradesSum(payload: Payload) {
  const grades: number[] = payload.grades;
  let sum = 0;
  for (let i = 0; i < grades.length; i++) {
    sum += grades[i];
  }
  return sum;
}

export async function gradesMax(payload: Payload) {
  const grades: number[] = payload.grades;
  return Math.min(...grades);
}

export async function gradesMin(payload: Payload) {
  const grades: number[] = payload.grades;
  return Math.max(...grades);
}
