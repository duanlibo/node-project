const express = require("express");
const router = express.Router();
const { Category, Course } = require("../../models");
const { Op } = require("sequelize");
const { NotFoundError } = require('../../utils/errors');
const { success, failure } = require('../../utils/responses');


// 查询分类列表
router.get("/", async function (req, res, next) {
  try {
    const query = req.query;
    const currentPage = Math.abs(Number(query.currentPage)) || 1;
    const pageSize = Math.abs(Number(query.pageSize)) || 10;
    const offset = (currentPage - 1) * pageSize;

    const condition = {
      order: [['rank', 'ASC'], ['id', 'ASC']],
      limit: pageSize,
      offset: offset,
    };
    if (query.title) {
      condition["where"] = { title: { [Op.like]: `%${query.title}%` } };
    }
    const { count, rows } = await Category.findAndCountAll(condition);
    success(res, "查询分类列表成功。", {
      categories: rows,
      pagination: {
        total: count,
        currentPage,
        pageSize,
      },
    });
  } catch (err) {
    failure(res, err);
  }
});

/**
 * 查询分类详情
 * GET /admin/categories/:id
 */
router.get("/:id", async function (req, res) {
  try {
    const category = await getCategory(req);

    success(res, "查询分类成功。", { category });
  } catch (error) {
    failure(res, error);
  }
});

// 创建分类
router.post("/", async function (req, res, next) {
  try {
    const category = await Category.create(filterBody(req));
    success(res, "创建分类成功。", { category }, 201);
  } catch (err) {
    failure(res, err);
  }
});

/**
 * 更新分类
 * PUT /admin/categories/:id
 */
router.put("/:id", async function (req, res) {
  try {
    const category = await getCategory(req);
    const body = filterBody(req);

    await category.update(body);
    success(res, "更新分类成功。", { category });
  } catch (error) {
    failure(res, error);
  }
});

/**
 * 删除分类
 * DELETE /admin/categories/:id
 */
router.delete("/:id", async function (req, res) {
  try {
    const category = await getCategory(req);
    const count = await Course.count({ where: { categoryId: req.params.id } });
    if (count > 0) {
      throw new Error('当前分类有课程，无法删除。');
    }
    await category.destroy();
    success(res, "删除分类成功。");
  } catch (error) {
    failure(res, error);
  }
});

/**
 * 公共方法：白名单过滤
 * @param req
 * @returns {{name, rank: *}}
 */

const filterBody = (req) => {
  return {
    name: req.body.name,
    rank: req.body.rank,
  };
};

async function getCategory(req) {
  const { id } = req.params;
  const condition = {
    include: [
      {
        model: Course,
        as: "courses",
      },
    ],
  };
  const category = await Category.findByPk(id, condition);
  if (!category) {
    throw new NotFoundError(`ID: ${id} 对应的分类不存在`);
  }
  return category;
}
module.exports = router;
