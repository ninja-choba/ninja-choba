export default function Loading() {
  return (
    <div className="min-h-dvh pb-20 bg-white">
      <div className="sticky top-0 h-14 bg-white/95 border-b border-[#E5E0D8]" />
      <div className="max-w-lg mx-auto px-4 pt-5 space-y-3 animate-pulse">
        {[...Array(4)].map((_,i) => <div key={i} className="bg-[#F5F5F5] rounded-xl h-24" />)}
      </div>
    </div>
  )
}
