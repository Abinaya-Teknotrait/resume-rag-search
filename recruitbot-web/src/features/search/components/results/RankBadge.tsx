interface RankBadgeProps {
  rank: number;
}

export function RankBadge({ rank }: RankBadgeProps) {
  const isTopThree = rank <= 3;
  const bgClass = isTopThree
    ? rank === 1
      ? 'bg-gradient-to-br from-yellow-500 to-orange-500'
      : rank === 2
        ? 'bg-gradient-to-br from-gray-400 to-gray-600'
        : 'bg-gradient-to-br from-orange-600 to-orange-700'
    : 'bg-slate-700';

  return (
    <div className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${bgClass} text-xs font-bold text-white`}>
      #{rank}
    </div>
  );
}
