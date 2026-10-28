import { Types } from 'mongoose'

/**
 * Converts an id string into an ObjectId for use in an aggregation `$match`.
 *
 * `find()` casts id strings automatically; aggregation does not, and an uncast
 * id matches no documents without raising an error — producing zeroed metrics
 * that look like real data.
 */
export function toObjectId(id: string): Types.ObjectId {
  return new Types.ObjectId(id)
}
