import postgres from "postgres";
export const sql = postgres(import.meta.env.PG_URL!, { prepare: false });

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import "dayjs/locale/es";

dayjs.extend(utc);
dayjs.extend(timezone);
