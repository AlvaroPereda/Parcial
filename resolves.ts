import type { Collection } from "mongodb";
import type { User, UserModel } from "./type.ts";

export const getAmigos = async(
    usuario : UserModel,
    userCollection: Collection<UserModel>
):Promise<User> => {
    const aux = usuario.amigos
    return ({
        id: usuario._id?.toString(),
        nombre: usuario.nombre,
        email: usuario.email,
        telefono: usuario.telefono,
        amigos: await userCollection.find({_id:{$in:aux}}).toArray()
    })
}