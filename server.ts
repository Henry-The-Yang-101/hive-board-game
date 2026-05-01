import { createServer } from "node:http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { registerSocketHandlers } from "./src/server/socket";

const dev = process.env.NODE_ENV !== "production";
const host = "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);

const app = next({ dev, hostname: host, port });
const handler = app.getRequestHandler();

async function bootstrap() {
  await app.prepare();
  const httpServer = createServer(handler);
  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*" }
  });

  registerSocketHandlers(io);

  httpServer.listen(port, host, () => {
    console.log(`Server ready on http://${host}:${port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
