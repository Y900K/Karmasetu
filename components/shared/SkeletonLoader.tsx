import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className = '' }: SkeletonProps) => {
  return (
    <div className={`animate-pulse rounded-md bg-white/5 ${className}`} />
  );
};

export const KPICardSkeleton = () => (
  <div className="rounded-2xl border border-white/5 bg-[#1e293b]/40 p-5 shadow-xl h-32">
    <div className="flex items-center justify-between mb-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-8 rounded-lg" />
    </div>
    <Skeleton className="h-8 w-16 mb-2" />
    <Skeleton className="h-3 w-32" />
  </div>
);

export const CourseCardSkeleton = () => (
  <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-4 h-24">
    <div className="flex items-center gap-4 h-full">
      <Skeleton className="h-11 w-11 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-2 w-1/4" />
      </div>
    </div>
  </div>
);

export const EventSkeleton = () => (
  <div className="flex items-center gap-3 p-3 rounded-xl bg-[#020817]/40 border border-white/5 h-16">
    <Skeleton className="h-11 w-11 rounded-lg shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-16" />
    </div>
    <Skeleton className="h-5 w-12 rounded-xl" />
  </div>
);
