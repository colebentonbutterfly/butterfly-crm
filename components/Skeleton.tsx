export function SkeletonCard({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-200 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
              <div className="h-3 bg-gray-200 rounded w-1/4" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card animate-pulse p-3">
          <div className="w-full h-32 bg-gray-200 rounded-lg mb-2" />
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-1" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      ))}
    </>
  );
}

export function SkeletonStats() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card text-center">
            <div className="h-8 bg-gray-200 rounded w-12 mx-auto mb-1" />
            <div className="h-3 bg-gray-200 rounded w-16 mx-auto" />
          </div>
        ))}
      </div>
      <div className="card">
        <div className="h-4 bg-gray-200 rounded w-40 mb-3" />
        <div className="h-4 bg-gray-200 rounded-full" />
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <div className="h-4 bg-gray-200 rounded w-32 mb-3" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-3 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
        <div className="card">
          <div className="h-4 bg-gray-200 rounded w-32 mb-3" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-3 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonDetail() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-40" />
      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-1/3 space-y-4">
          <div className="w-full aspect-square bg-gray-200 rounded-xl" />
          <div className="card"><div className="h-16 bg-gray-200 rounded" /></div>
        </div>
        <div className="flex-1 space-y-4">
          <div className="card space-y-3">
            <div className="h-7 bg-gray-200 rounded w-2/3" />
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="grid grid-cols-2 gap-4 mt-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}><div className="h-3 bg-gray-200 rounded w-16 mb-1" /><div className="h-4 bg-gray-200 rounded w-24" /></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
