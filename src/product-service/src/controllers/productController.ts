import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest, ProductQuery } from "../types";
import { getCache, setCache, clearCache } from "../utils/cache";
import { Review } from "../models/Review";
import { uploadToCloudinary } from "../utils/cloudinary";
import { logger } from "../utils/logger";

const prisma = new PrismaClient();

export const getProducts = async (req: AuthRequest, res: Response) => {
  const {
    page = "1",
    limit = "12",
    search,
    category,
    minPrice,
    maxPrice,
    sort = "createdAt",
    featured,
  } = req.query as ProductQuery;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  if (category) {
    where.category = { slug: category };
  }

  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price.gte = parseFloat(minPrice);
    if (maxPrice) where.price.lte = parseFloat(maxPrice);
  }

  if (featured === "true") {
    where.featured = true;
  }

  const cacheKey = `products:${JSON.stringify({ page: pageNum, limit: limitNum, search, category, minPrice, maxPrice, sort, featured })}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const orderBy: any = {};
  if (sort === "price_asc") orderBy.price = "asc";
  else if (sort === "price_desc") orderBy.price = "desc";
  else if (sort === "name") orderBy.name = "asc";
  else orderBy.createdAt = "desc";

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true },
      skip,
      take: limitNum,
      orderBy,
    }),
    prisma.product.count({ where }),
  ]);

  const result = {
    products,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  };

  await setCache(cacheKey, result, 300);
  return res.json(result);
};

export const getProductById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const cacheKey = `product:${id}`;
  const cached = await getCache(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  const reviews = await Review.find({ productId: id }).sort({ createdAt: -1 }).limit(10);

  const result = { ...product, reviews };
  await setCache(cacheKey, result, 300);
  return res.json(result);
};

export const createProduct = async (req: AuthRequest, res: Response) => {
  const { name, slug, description, price, comparePrice, stock, categoryId, featured } = req.body;

  const files = req.files as Express.Multer.File[];
  const images: string[] = [];
  if (files && files.length > 0) {
    for (const file of files) {
      const url = await uploadToCloudinary(file.buffer);
      images.push(url);
    }
  }

  const product = await prisma.product.create({
    data: {
      name,
      slug,
      description,
      price: parseFloat(price),
      comparePrice: comparePrice ? parseFloat(comparePrice) : null,
      stock: parseInt(stock, 10),
      categoryId,
      featured: featured === "true",
      images,
    },
    include: { category: true },
  });

  await clearCache("products:*");
  await clearCache(`product:${product.id}`);

  logger.info(`Product created: ${product.name}`);
  return res.status(201).json(product);
};

export const updateProduct = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, slug, description, price, comparePrice, stock, categoryId, featured } = req.body;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: "Product not found" });
  }

  const data: any = {};
  if (name) data.name = name;
  if (slug) data.slug = slug;
  if (description) data.description = description;
  if (price) data.price = parseFloat(price);
  if (comparePrice !== undefined) data.comparePrice = comparePrice ? parseFloat(comparePrice) : null;
  if (stock) data.stock = parseInt(stock, 10);
  if (categoryId) data.categoryId = categoryId;
  if (featured !== undefined) data.featured = featured === "true";

  const files = req.files as Express.Multer.File[];
  if (files && files.length > 0) {
    const uploadedUrls: string[] = [];
    for (const file of files) {
      const url = await uploadToCloudinary(file.buffer);
      uploadedUrls.push(url);
    }
    data.images = uploadedUrls;
  }

  const product = await prisma.product.update({
    where: { id },
    data,
    include: { category: true },
  });

  await clearCache("products:*");
  await clearCache(`product:${id}`);

  logger.info(`Product updated: ${product.name}`);
  return res.json(product);
};

export const deleteProduct = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: "Product not found" });
  }

  await prisma.product.delete({ where: { id } });
  await Review.deleteMany({ productId: id });

  await clearCache("products:*");
  await clearCache(`product:${id}`);

  logger.info(`Product deleted: ${id}`);
  return res.json({ message: "Product deleted successfully" });
};

export const addReview = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  const review = await Review.create({
    productId: id,
    userId: req.user!.id,
    userName: req.user!.email,
    rating,
    comment,
  });

  await clearCache(`product:${id}`);

  logger.info(`Review added for product ${id}`);
  return res.status(201).json(review);
};
