import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { HttpError } from '../errors.js';
import { TaskRepository } from './repository.js';
import {
  createTaskSchema,
  listTasksSchema,
  updateTaskSchema,
} from './schema.js';

const idSchema = z.coerce.number().int().positive();

export const taskRoutes: FastifyPluginAsync = async (app) => {
  const repository = new TaskRepository(app.database);
  app.get(
    '/',
    { schema: { tags: ['tasks'], summary: 'List and filter tasks' } },
    async (request) => repository.list(listTasksSchema.parse(request.query)),
  );
  app.post(
    '/',
    { schema: { tags: ['tasks'], summary: 'Create a task' } },
    async (request, reply) => {
      const task = repository.create(createTaskSchema.parse(request.body));
      return reply
        .code(201)
        .header('location', `/v1/tasks/${task.id}`)
        .send(task);
    },
  );
  app.get(
    '/:id',
    { schema: { tags: ['tasks'], summary: 'Get a task' } },
    async (request) => {
      const id = idSchema.parse((request.params as { id?: unknown }).id);
      const task = repository.get(id);
      if (!task)
        throw new HttpError(404, 'TASK_NOT_FOUND', `Task ${id} was not found`);
      return task;
    },
  );
  app.patch(
    '/:id',
    { schema: { tags: ['tasks'], summary: 'Update a task' } },
    async (request) => {
      const id = idSchema.parse((request.params as { id?: unknown }).id);
      const task = repository.update(id, updateTaskSchema.parse(request.body));
      if (!task)
        throw new HttpError(404, 'TASK_NOT_FOUND', `Task ${id} was not found`);
      return task;
    },
  );
  app.delete(
    '/:id',
    { schema: { tags: ['tasks'], summary: 'Delete a task' } },
    async (request, reply) => {
      const id = idSchema.parse((request.params as { id?: unknown }).id);
      if (!repository.delete(id))
        throw new HttpError(404, 'TASK_NOT_FOUND', `Task ${id} was not found`);
      return reply.code(204).send();
    },
  );
};
