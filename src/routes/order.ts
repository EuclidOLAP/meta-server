import { Router, Request, Response } from "express";

const router = Router();

// 模拟订单数据
let orders = [
  { id: 1, product: "Laptop", quantity: 2 },
  { id: 2, product: "Mouse", quantity: 5 },
];

// 查询所有订单
router.get("/", (req: Request, res: Response) => {
  res.json(orders);
});

// 查询单个订单
router.get("/:id", (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const order = orders.find((o) => o.id === id);
  if (order) {
    res.json(order);
  } else {
    res.status(404).json({ error: "Order not found" });
  }
});

// 新增订单
router.post("/", (req: Request, res: Response) => {
  const newOrder = {
    id: orders.length ? orders[orders.length - 1].id + 1 : 1,
    product: req.body.product,
    quantity: req.body.quantity,
  };
  orders.push(newOrder);
  res.status(201).json(newOrder);
});

// 更新订单
router.put("/:id", (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const index = orders.findIndex((o) => o.id === id);
  if (index !== -1) {
    orders[index] = { id, ...req.body };
    res.json(orders[index]);
  } else {
    res.status(404).json({ error: "Order not found" });
  }
});

// 删除订单
router.delete("/:id", (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const index = orders.findIndex((o) => o.id === id);
  if (index !== -1) {
    const deleted = orders.splice(index, 1);
    res.json(deleted[0]);
  } else {
    res.status(404).json({ error: "Order not found" });
  }
});

export default router;
