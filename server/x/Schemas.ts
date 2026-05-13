import { Effect, Schema } from "effect"

const def = <S extends Schema.Top>(self: S, value: S["Encoded"]) =>
  self.pipe(Schema.withDecodingDefaultKey(Effect.succeed(value)))

const countField = def(Schema.Number, 0)

export const PublicMetrics = Schema.Struct({
  like_count: countField,
  reply_count: countField,
  retweet_count: countField,
  quote_count: countField,
  bookmark_count: countField,
  impression_count: countField
})

export const UserPublicMetrics = Schema.Struct({
  followers_count: countField
})

export const UserShape = Schema.Struct({
  id: Schema.String,
  username: Schema.String,
  name: Schema.String,
  profile_image_url: Schema.optional(Schema.String),
  public_metrics: def(UserPublicMetrics, {})
})

export const TweetShape = Schema.Struct({
  id: Schema.String,
  text: Schema.String,
  created_at: Schema.DateTimeUtcFromString,
  author_id: Schema.optional(Schema.String),
  public_metrics: def(PublicMetrics, {})
})
export type Tweet = Schema.Schema.Type<typeof TweetShape>

export const UsersByResponse = Schema.Struct({
  data: def(Schema.Array(UserShape), []),
  errors: Schema.optional(
    Schema.Array(
      Schema.Struct({
        title: Schema.optional(Schema.String),
        detail: Schema.optional(Schema.String)
      })
    )
  )
})
export type UsersByResponse = Schema.Schema.Type<typeof UsersByResponse>

export const TweetsResponse = Schema.Struct({
  data: def(Schema.Array(TweetShape), []),
  meta: Schema.optional(
    Schema.Struct({
      next_token: Schema.optional(Schema.String)
    })
  )
})
export type TweetsResponse = Schema.Schema.Type<typeof TweetsResponse>

export const SearchResponse = Schema.Struct({
  data: def(Schema.Array(TweetShape), []),
  meta: Schema.optional(
    Schema.Struct({
      newest_id: Schema.optional(Schema.String),
      oldest_id: Schema.optional(Schema.String),
      result_count: Schema.optional(Schema.Number),
      next_token: Schema.optional(Schema.String)
    })
  )
})
export type SearchResponse = Schema.Schema.Type<typeof SearchResponse>
