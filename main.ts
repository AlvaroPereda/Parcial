import { MongoClient, ObjectId } from "mongodb"
import type { UserModel } from "./type.ts";
import { getAmigos } from "./resolves.ts";

const url = Deno.env.get("MONGO_URL")

if(!url) Deno.exit(1)

const client = new MongoClient(url)

await client.connect()
console.log("Conectado correctamente a la base de datos")

const db = client.db("Personas")

const userCollection = db.collection<UserModel>("users")

const handler = async(req: Request):Promise<Response> => {
  const url = new URL(req.url)
  const method = req.method
  const path = url.pathname
  const searchParamas = url.searchParams

  if(method === "GET") {
    if(path === "/personas") {
      const nombre = searchParamas.get("nombre")
      if(nombre) {
        const result = await userCollection.findOne({nombre})
        if(result === null) return new Response("Persona no encontrada", {status:404})
        const resultFinal = await getAmigos(result,userCollection)
        return new Response(JSON.stringify(resultFinal))
      } else if(!nombre) {
        const result = await userCollection.find().toArray()
        const resultFinal = await Promise.all(result.map(e => getAmigos(e,userCollection)))
        return new Response(JSON.stringify(resultFinal))
      } 
    } else if(path === "/persona") {
      const email = searchParamas.get("email")
      if(email) {
        const result = await userCollection.findOne({email})
        if(result === null) return new Response("Persona no encontrada", {status:404})
          const resultFinal = await getAmigos(result,userCollection)
        return new Response(JSON.stringify(resultFinal))
      }
    }
  } else if(method === "POST") {
    if(path === "/personas") {
      const body = await req.json()
      if(!body.nombre || !body.email || !body.telefono || !body.amigos) return new Response("Bad request", {status:400})
      const comprobarEmail = await userCollection.findOne({email:body.email})
      const comprobarTelefono = await userCollection.findOne({telefono:body.telefono})
      if(comprobarEmail || comprobarTelefono) return new Response("El email o teléfono ya están registrados.", {status:400})
      const { insertedId } = await userCollection.insertOne({
        nombre: body.nombre,
        email: body.email,
        telefono: body.telefono,
        amigos: body.amigos.map((e:string) => new ObjectId(e))
      })
      return new Response(JSON.stringify({
        "message": "Usuario creado correctamente",
        _id: insertedId,
        nombre: body.nombre,
        email: body.email,
        telefono: body.telefono,
        amigos: body.amigos
      }))
    }
  } else if(method === "PUT") {
    if(path === "/persona") {
      const body = await req.json()
      if(!body.nombre || !body.email || !body.telefono || !body.amigos) return new Response("Faltan datos", {status:400})
      const { modifiedCount } = await userCollection.updateOne(
        {email:body.email},
        {$set: {
          nombre: body.nombre,
          email: body.email,
          telefono: body.telefono,
          amigos: body.amigos.map((e:string) => new ObjectId(e))
        }}
      )
      if(modifiedCount === 0) return new Response("Usuario no encontrado", {status:404})
      return new Response(JSON.stringify({
        "message": "Persona actualizada exitosamente",
        nombre: body.nombre,
        email: body.email,
        telefono: body.telefono,
        amigos: await Promise.all(body.amigos.map((e:string) => userCollection.findOne({_id:new ObjectId(e)})))
      }))
    } else if (path === "/persona/amigo") {
      const body = await req.json()
      if(!body.personaEmail || !body.amigoID) return new Response("Faltan datos", {status:400})
      const comprobarTelefono = await userCollection.findOne({_id:body.amigoID})
      if(comprobarTelefono) return new Response("Amigo no encontrado.", {status:400})
      
      const { modifiedCount } = await userCollection.updateOne(
        {email:body.personaEmail},
        {$push:{
          amigos: new ObjectId(body.amigoID)
        }}
      ) 
      if(modifiedCount === 0) return new Response("Usuario no encontrado", {status:404})
      return new Response("Amigo añadido")

    }
  } else if(method === "DELETE") {
    if(path === "/persona") {
      const body = await req.json()
      if(!body.email) return new Response("Faltan email", {status:400})
      const { deletedCount } = await userCollection.deleteOne({email:body.email})
      if(deletedCount === 0) return new Response("Usuario no encontrado", {status:404})
      return new Response("Persona eliminada exitosamente")
    }
  }

  return new Response("Endopoint not found", {status:400})
}

Deno.serve({port:3000},handler)