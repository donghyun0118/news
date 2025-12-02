import path from "path";
import swaggerJsdoc from "swagger-jsdoc";
import { swaggerDefinition } from "./swagger-definition";

const options: swaggerJsdoc.Options = {
  definition: swaggerDefinition,
  apis: [path.join(process.cwd(), "src/routes/**/*.ts")],
};

export const specs = swaggerJsdoc(options);
