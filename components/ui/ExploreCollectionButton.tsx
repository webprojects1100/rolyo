"use client";

export default function ExploreCollectionButton() {
  return (
    <button
      onClick={() => window.location.href = '/shop'}
      className="mt-6 bg-white text-black py-3 px-6 rounded border border-black hover:bg-black hover:text-white transition"
    >
      Explore Collection
    </button>
  );
}