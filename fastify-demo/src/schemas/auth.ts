import { Type } from 'typebox'

export interface Auth {
  id: number;
  username: string;
  email: string,
  roles: string[]
}

// Added for the BuildBase example: what BuildBase's hosted page sends back.
export const BuildBaseCallbackQuerySchema = Type.Object({
  code: Type.Optional(Type.String()),
  state: Type.Optional(Type.String()),
  error: Type.Optional(Type.String())
})
