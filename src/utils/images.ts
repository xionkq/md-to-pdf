export async function fetchImageAsDataURL(src: string): Promise<string> {
  const res = await fetch(src)
  if (!res.ok) throw new Error(`Failed to load image: ${res.status} ${res.statusText}`)
  const blob = await res.blob()
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
