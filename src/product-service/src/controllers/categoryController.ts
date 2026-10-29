import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { getCache, setCache } from "../utils/cache";
import { logger } from "../utils/logger";

const prisma = new PrismaClient();

export const getCategories = async (_req: Request, res: Response) => {
  const cached = await getCache("categories");
  if (cached) {
    return res.json(cached);
  }

  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
  });

  await setCache("categories", categories, 3600);
  return res.json(categories);
};

export const createCategory = async (req: Request, res: Response) => {
  const { name, slug } = req.body;

  const category = await prisma.category.create({
    data: { name, slug },
  });

  const { clearCache } = await import("../utils/cache");
  await clearCache("categories*");

  logger.info(`Category created: ${category.name}`);
  return res.status(201).json(category);
};
