import { cache } from "react";
import { getProjectById } from "./actions";

/**
 * getProjectById, run at most once per server request. The study layout (shared header), the
 * page and its metadata all ask for the same study; this keeps it to one database read.
 */
export const getStudyOnce = cache((id: string) => getProjectById(id));
