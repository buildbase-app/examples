// Modified from Nutlope/roomGPT: BuildBase credits replace the per-IP daily
// rate limit. A signed-in workspace pays for each generated room, and a failed
// generation is never charged.
import { NextResponse } from "next/server";
import { bb } from "../../lib/buildbase";
import { canAfford, charge } from "../../lib/credits";

export async function POST(request: Request) {
  const user = await bb()
    .users.getProfile()
    .catch(() => null);
  if (!user) {
    return NextResponse.json("Sign in to generate a room.", { status: 401 });
  }

  const { imageUrl, theme, room, workspaceId } = await request.json();
  if (!workspaceId) {
    return NextResponse.json("No workspace selected yet. Try again.", {
      status: 400,
    });
  }
  // Checked before the model runs, so an empty balance costs nothing.
  if (!(await canAfford(workspaceId))) {
    return NextResponse.json("You are out of credits.", { status: 402 });
  }

  // Without a Replicate key the app still runs, so the sign-in and credits
  // flow can be tried first; it returns a sample result, clearly labelled.
  if (!process.env.REPLICATE_API_KEY) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    if (!(await charge(workspaceId, crypto.randomUUID()))) {
      return NextResponse.json("You are out of credits.", { status: 402 });
    }
    return NextResponse.json({
      output: [imageUrl, "/generated-pic-2.jpg"],
      demo: true,
    });
  }

  // POST request to Replicate to start the image restoration generation process
  let startResponse = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Token " + process.env.REPLICATE_API_KEY,
    },
    body: JSON.stringify({
      version:
        "854e8727697a057c525cdb45ab037f64ecca770a1769cc52287c2e56472a247b",
      input: {
        image: imageUrl,
        prompt:
          room === "Gaming Room"
            ? "a room for gaming with gaming computers, gaming consoles, and gaming chairs"
            : `a ${theme.toLowerCase()} ${room.toLowerCase()}`,
        a_prompt:
          "best quality, extremely detailed, photo from Pinterest, interior, cinematic photo, ultra-detailed, ultra-realistic, award-winning",
        n_prompt:
          "longbody, lowres, bad anatomy, bad hands, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality",
      },
    }),
  });

  let jsonStartResponse = await startResponse.json();

  let predictionId: string = jsonStartResponse.id;
  let endpointUrl = jsonStartResponse.urls.get;

  // GET request to get the status of the image restoration process & return the result when it's ready
  let restoredImage: string | null = null;
  while (!restoredImage) {
    // Loop in 1s intervals until the alt text is ready
    console.log("polling for result...");
    let finalResponse = await fetch(endpointUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Token " + process.env.REPLICATE_API_KEY,
      },
    });
    let jsonFinalResponse = await finalResponse.json();

    if (jsonFinalResponse.status === "succeeded") {
      restoredImage = jsonFinalResponse.output;
    } else if (jsonFinalResponse.status === "failed") {
      break;
    } else {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  if (!restoredImage) {
    return NextResponse.json("Failed to restore image", { status: 500 });
  }
  // Charged only once the image exists; the prediction ID makes it idempotent.
  if (!(await charge(workspaceId, predictionId))) {
    return NextResponse.json("You are out of credits.", { status: 402 });
  }
  return NextResponse.json({ output: restoredImage, demo: false });
}
