import type { ObjectId, OptionalId } from "mongodb";

export type UserModel = OptionalId<{
    nombre: string,
    email:string,
    telefono: string,
    amigos: ObjectId[]
}>

export type User = {
    id?: string,
    nombre: string,
    email:string,
    telefono: string,
    amigos: User[]
}