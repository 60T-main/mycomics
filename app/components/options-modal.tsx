"use client";

export default function OptionsModal() {
  return (
    <div className={`dropdown character`}>
      <div className="effect"></div>
      <div className="tint"></div>
      <div className="shine"></div>
      <div className="dropdown-content">
        <button className="edit">რედაქტირება</button>
        <button className="delete">წაშლა</button>
      </div>
    </div>
  );
}
