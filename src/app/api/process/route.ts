// AI-01 genuine provider endpoint. See src/lib/processing/handler.ts for the security boundary.
import { handleProcess } from "@/lib/processing/handler";

export const POST = (req: Request) => handleProcess(req);
