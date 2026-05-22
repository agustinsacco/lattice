import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), "apps/web/.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function initStorage() {
  console.log("Initializing Supabase Storage buckets...");

  const bucketName = "lattice-artifacts";

  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error("Error listing buckets:", listError.message);
    process.exit(1);
  }

  const exists = buckets.find((b) => b.name === bucketName);

  if (!exists) {
    console.log(`Creating bucket: ${bucketName}`);
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
      allowedMimeTypes: ["application/sla", "text/plain", "image/png", "image/jpeg"],
    });

    if (createError) {
      console.error(`Error creating bucket ${bucketName}:`, createError.message);
      process.exit(1);
    }
    console.log(`Bucket ${bucketName} created successfully.`);
  } else {
    console.log(`Bucket ${bucketName} already exists.`);
  }
}

initStorage();
