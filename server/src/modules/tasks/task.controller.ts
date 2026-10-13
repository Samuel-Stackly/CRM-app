import type { Request, Response } from 'express'

import { ApiError } from '../../utils/ApiError.js'
import type { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from './task.schemas.js'
import * as taskService from './task.service.js'

function ownerId(req: Request): string {
  if (!req.user) {
    throw ApiError.unauthorized()
  }
  return req.user.id
}

function taskId(req: Request): string {
  return req.params['id'] as string
}

export async function list(req: Request, res: Response): Promise<void> {
  const result = await taskService.listTasks(
    ownerId(req),
    req.query as unknown as ListTasksQuery,
  )
  res.status(200).json(result)
}

export async function create(req: Request, res: Response): Promise<void> {
  const task = await taskService.createTask(ownerId(req), req.body as CreateTaskInput)
  res.status(201).json(task)
}

export async function getById(req: Request, res: Response): Promise<void> {
  res.status(200).json(await taskService.getTask(ownerId(req), taskId(req)))
}

export async function update(req: Request, res: Response): Promise<void> {
  const task = await taskService.updateTask(
    ownerId(req),
    taskId(req),
    req.body as UpdateTaskInput,
  )
  res.status(200).json(task)
}

export async function remove(req: Request, res: Response): Promise<void> {
  await taskService.deleteTask(ownerId(req), taskId(req))
  res.status(204).send()
}
