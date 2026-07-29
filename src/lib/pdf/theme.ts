import { rgb } from "pdf-lib";

// A4 portrait, in points.
export const PAGE_WIDTH = 595.28;
export const PAGE_HEIGHT = 841.89;
export const MARGIN = 48;

export const COLOR = {
  navy: rgb(0x0c / 255, 0x23 / 255, 0x40 / 255),
  navyLight: rgb(0x1c / 255, 0x3a / 255, 0x60 / 255),
  ink: rgb(0x14 / 255, 0x13 / 255, 0x0f / 255),
  grey: rgb(0x52 / 255, 0x4d / 255, 0x40 / 255),
  greyLight: rgb(0x83 / 255, 0x7c / 255, 0x6c / 255),
  band: rgb(0.93, 0.935, 0.94),
  bandLine: rgb(0.82, 0.82, 0.83),
  hairline: rgb(0.85, 0.85, 0.85),
  white: rgb(1, 1, 1),
  green: rgb(0x2f / 255, 0x6f / 255, 0x4e / 255),
  red: rgb(0xb2 / 255, 0x3b / 255, 0x2e / 255),
  photoPlaceholder: rgb(0.86, 0.86, 0.86),
};
