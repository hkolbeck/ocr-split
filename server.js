const vision = require("@google-cloud/vision");
const path = require("path");
const fastify = require("fastify")({
    logger: false,
});

fastify.register(require("@fastify/static"), {
    root: path.join(__dirname, "public"),
    prefix: "/",
});

fastify.get("/", function (req, reply) {
    reply.sendFile("index.html");
});

const visionClient = new vision.ImageAnnotatorClient();
fastify.post("/api/v1/ocr", async function (req, reply) {
    const ocrRequest = {
        image: {
            content: Buffer.from(req.body, "base64"),
        },
    };

    let [result] = await visionClient.documentTextDetection(ocrRequest).catch((err) => {
        console.log(err);
        return [];
    });

    // console.log(JSON.stringify(result))
    reply.code(200);
    reply.send(processResult(result));
});

function processResult(result) {
    if (!result) {
        return [];
    }
    const {pages} = result.fullTextAnnotation;
    const words = [];
    pages.forEach((page) => {
        page.blocks.forEach((block) => {
            if (block.blockType === "TEXT") {
                block.paragraphs.forEach((para) => {
                    para.words.forEach((word) => {
                        let txt = word.symbols.map((s) => s.text).join("")
                        console.log("Word: " + txt);
                        console.log("JSON: " + JSON.stringify(word));
                    });
                });
            }
        });
    });

    return words;
}

function getBoundingRect(block) {
    let xs = block.boundingBox.vertices.map((v) => v.x);
    let ys = block.boundingBox.vertices.map((v) => v.y);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
        l: minX,
        r: maxX,
        t: minY,
        b: maxY,
    };
}



fastify.listen(
    {port: process.env.PORT, host: "0.0.0.0"},
    function (err, address) {
        if (err) {
            console.error(err);
            process.exit(1);
        }
        console.log(`Your app is listening on ${address}`);
    }
);