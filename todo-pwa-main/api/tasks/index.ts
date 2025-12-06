import type { VercelRequest, VercelResponse } from '@vercel/node';
import mongoose from 'mongoose';
import Task from '../models/Task.js';
import jwt from 'jsonwebtoken';

interface JwtPayload { id: string; }

const connectDB = async () => {
  if (mongoose.connections[0].readyState) return;
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log("🔌 Conectado a MongoDB");
};

const authenticate = async (req: VercelRequest): Promise<string | null> => {
  try {
    const header = req.headers.authorization;
    console.log("🔑 Header de Auth recibido:", header ? "SÍ" : "NO"); // LOG 1
    
    const token = header?.replace('Bearer ', '');
    if (!token) return null;
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    console.log("👤 Usuario autenticado ID:", decoded.id); // LOG 2
    return decoded.id;
  } catch (e) {
    console.log("🚫 Error verificando token:", e); // LOG 3
    return null;
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await connectDB();
  
  // LOG 4: Ver si entra la petición
  if (req.method === 'POST') {
      console.log("📥 [POST] Intentando crear tarea...");
      console.log("📦 Body recibido:", JSON.stringify(req.body));
  }

  const userId = await authenticate(req);
  if (!userId) {
    console.log("⛔ Petición rechazada: No autorizado");
    return res.status(401).json({ message: "No autorizado" });
  }

  try {
    // --- GET ---
    if (req.method === 'GET') {
      const tasks = await Task.find({ user: userId, isDeleted: false }).sort({ createdAt: -1 });
      return res.json(tasks);
    } 
    
    // --- POST ---
    if (req.method === 'POST') {
      const { title, description } = req.body;
      
      if (!title) {
          console.log("⚠️ Falta el título");
          return res.status(400).json({ message: 'El título es requerido' });
      }
      
      const task = await Task.create({ 
        user: userId, 
        title, 
        description, 
        status: 'Pending', 
        isDeleted: false 
      });
      
      console.log("✅ ¡EXITO! Tarea guardada en DB con ID:", task._id);
      return res.status(201).json(task);
    } 
    
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Método ${req.method} no permitido` });

  } catch (error) {
    console.error("❌ CRASH en el servidor:", error);
    let errorMessage = "Error del servidor";
    if (error instanceof Error) errorMessage = error.message;
    return res.status(500).json({ message: errorMessage });
  }
}