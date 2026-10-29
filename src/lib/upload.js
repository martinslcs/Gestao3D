import { supabase, BUCKET } from './supabase'

/** Reduz a imagem (máx. 1600px, JPEG) antes de enviar — economiza armazenamento. */
async function shrink(file, max = 1600) {
  if (!file.type.startsWith('image/') || ['image/gif', 'image/svg+xml'].includes(file.type)) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.85))
  } catch {
    return file
  }
}

export async function uploadImage(file, userId) {
  const blob = await shrink(file)
  const ext = blob.type === 'image/jpeg' ? 'jpg' : (file.name.split('.').pop() || 'png')
  const path = `${userId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('quote-photos').upload(path, blob, {
    contentType: blob.type, upsert: false,
  })
  if (error) throw error
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}
