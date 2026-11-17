export interface Camera {
  yaw: number;
  pitch: number;
  fov: number;
}
export interface Chapter {
  id: string;
  title: string;
  subtitle: string;
  duration: number;
  panorama: string;
  video: string;
  location: string;
  description: string;
  /** 导演推荐方向：进入章节时的默认构图 */
  opening: Camera;
}
export interface Hotspot {
  id: string;
  chapterId: string;
  title: string;
  kind: "person" | "archive" | "sound";
  start: number;
  end: number;
  yaw: number;
  pitch: number;
  summary: string;
  personId?: string;
}
export interface Person {
  id: string;
  name: string;
  role: string;
  quote: string;
  paragraphs: string[];
}
export interface Position {
  chapterId: string;
  time: number;
  camera: Camera;
  playing: boolean;
}
export interface Entry {
  id: string;
  hotspotId: string;
  chapterId: string;
  time: number;
  camera: Camera;
  title: string;
  note: string;
  createdAt: number;
}
/**
 * 镜头锚点：用户为某章节收藏的命名构图。
 * camera 以球面角度（yaw/pitch）与垂直视野（fov）记录，
 * 不含任何像素量，因此窗口比例变化后仍对准同一对象。
 */
export interface Anchor {
  id: string;
  chapterId: string;
  name: string;
  camera: Camera;
  createdAt: number;
}
export type Command =
  | { type: "chapter"; id: string }
  | { type: "seek"; time: number }
  | { type: "hotspot"; id: string }
  | { type: "return" }
  | { type: "revisit"; entry: Entry };
