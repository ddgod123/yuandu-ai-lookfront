"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useState, useRef } from "react";
import { Download, Monitor, Tablet, MessageCircle } from "lucide-react";
import { toCanvas } from "html-to-image";
import { saveAs } from 'file-saver';
import { API_BASE, fetchWithAuth } from "@/lib/admin-auth";

interface Collection {
  id: number;
  title: string;
  description: string;
  file_count: number;
  category_id?: number;
  theme_id?: number;
  tags?: { id: number; name: string }[];
}

interface Category {
  id: number;
  name: string;
}

interface Theme {
  id: number;
  name: string;
}

interface CardTheme {
  id: number;
  name: string;
  slug: string;
  config: {
    bgColor: string;
    textColor: string;
    accentColor: string;
    fontFamily: string;
    gridStyle: string;
    showFeatured: boolean;
    gridCols?: number;
    gridRows?: number;
    cardRatio?: string;
  };
}

interface Emoji {
  id: number;
  preview_url: string;
  file_url: string;
}

export default function XhsGenerator() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [cardThemes, setCardThemes] = useState<CardTheme[]>([]);
  const [selectedColId, setSelectedColId] = useState<number | null>(null);
  const [selectedCardThemeId, setSelectedCardThemeId] = useState<number | null>(null);
  const [emojis, setEmojis] = useState<Emoji[]>([]);
  const [, setLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg'>('png');
  const [exporting, setExporting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  
  const coverRef = useRef<HTMLDivElement>(null);
  const spreadRef = useRef<HTMLDivElement>(null);
  const wechatRef = useRef<HTMLDivElement>(null);
  const ipadRef = useRef<HTMLDivElement>(null);
  const pptRef = useRef<HTMLDivElement>(null);
  const fullSetRefs = useRef<(HTMLDivElement | null)[]>([]);

  const loadData = async () => {
    try {
      const colRes = await fetchWithAuth(`${API_BASE}/api/collections?page_size=100`);
      if (colRes.ok) {
        const data = await colRes.json();
        const items = data.items || [];
        setCollections(items);
        if (items.length > 0 && !selectedColId) setSelectedColId(items[0].id);
      }
      
      const ctRes = await fetchWithAuth(`${API_BASE}/api/card-themes`);
      if (ctRes.ok) {
        const data = await ctRes.json();
        setCardThemes(data || []);
        if (data.length > 0 && !selectedCardThemeId) setSelectedCardThemeId(data[0].id);
      }

      const catRes = await fetchWithAuth(`${API_BASE}/api/admin/categories`);
      if (catRes.ok) setCategories(await catRes.json() || []);

      const themeRes = await fetchWithAuth(`${API_BASE}/api/admin/themes`);
      if (themeRes.ok) setThemes(await themeRes.json() || []);
    } catch (err) {
      console.error(err);
    }
  };

  // 首次加载字典数据
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedColId) {
      setLoading(true);
      fetchWithAuth(`${API_BASE}/api/emojis?collection_id=${selectedColId}&page_size=100`)
        .then((res) => res.json())
        .then((data) => {
          setEmojis(data.items || []);
          setLoading(false);
        });
    }
  }, [selectedColId]);

  const activeCardTheme = cardThemes.find(t => t.id === selectedCardThemeId) || cardThemes[0];
  const config = activeCardTheme?.config || {
    bgColor: "#fff5f5",
    textColor: "#1e293b",
    accentColor: "#fb7185",
    fontFamily: "serif",
    gridStyle: "sticker",
    showFeatured: true
  };
  const isTiledTheme = config.gridStyle === "tiled";
  const isMinimalTheme =
    (activeCardTheme?.name || "").includes("简约") ||
    (activeCardTheme?.slug || "").includes("minimal") ||
    (activeCardTheme?.slug || "").includes("minimalist");
  const isSquareTheme =
    isMinimalTheme ||
    (config.cardRatio || "").toLowerCase() === "1:1" ||
    (config.cardRatio || "").toLowerCase() === "square";
  const cardWidth = 600;
  const cardHeight = isSquareTheme ? cardWidth : 800;
  const rawCols = typeof config.gridCols === "number" ? config.gridCols : Number.parseInt(String(config.gridCols || ""), 10);
  const rawRows = typeof config.gridRows === "number" ? config.gridRows : Number.parseInt(String(config.gridRows || ""), 10);
  const tiledCols = Number.isFinite(rawCols) && rawCols > 0 ? rawCols : 4;
  const tiledRows = Number.isFinite(rawRows) && rawRows > 0 ? rawRows : 5;
  const coverCols = isTiledTheme ? tiledCols : 5;
  const coverRows = isTiledTheme ? tiledRows : 4;
  const coverPreviewCount = coverCols * coverRows;

  const waitForImages = async (node: HTMLElement) => {
    const images = Array.from(node.querySelectorAll("img"));
    await Promise.all(images.map((img) => {
      if (!img.src) return Promise.resolve();
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const done = () => resolve();
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      });
    }));
  };

  const exportImage = async (ref: React.RefObject<HTMLDivElement | null> | HTMLDivElement | null, fileName: string) => {
    const target = ref instanceof HTMLElement ? ref : ref?.current;
    if (!target || exporting) return;
    try {
      setExporting(true);
      if (document?.fonts?.ready) {
        await document.fonts.ready;
      }
      await waitForImages(target);

      const isScenario = target === spreadRef.current || target === wechatRef.current || target === ipadRef.current || target === pptRef.current;
      const options = { 
        pixelRatio: 2,
        backgroundColor: isScenario ? "#ffffff" : config.bgColor,
        style: { transform: 'scale(1)' }
      };

      const canvas = await toCanvas(target, options);
      const type = exportFormat === 'png' ? 'image/png' : 'image/jpeg';
      const quality = exportFormat === 'jpeg' ? 0.92 : 1;
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, type, quality)
      );
      if (blob) {
        saveAs(blob, `${fileName}.${exportFormat}`);
      } else {
        const dataUrl = canvas.toDataURL(type, quality);
        saveAs(dataUrl, `${fileName}.${exportFormat}`);
      }
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setExporting(false);
    }
  };

  const getProtocolFallback = (url: string) => {
    if (!url) return "";
    if (url.startsWith("https://")) return `http://${url.slice(8)}`;
    if (url.startsWith("http://")) return `https://${url.slice(7)}`;
    return url;
  };

  const handleEmojiImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    if (img.dataset.fallbackTried === "1") return;
    const original = img.dataset.src || img.src || "";
    const fallback = original ? getProtocolFallback(original) : "";
    if (!fallback || fallback === img.src) return;
    img.dataset.fallbackTried = "1";
    img.src = fallback;
  };

  const selectedCollection = collections.find((c) => c.id === selectedColId);
  const categoryName = categories.find(c => c.id === selectedCollection?.category_id)?.name || "Collection";
  const themeName = themes.find(t => t.id === selectedCollection?.theme_id)?.name;

  const emojisPerFullCard = isTiledTheme ? coverPreviewCount : 36;
  const tiledCardsCount = isTiledTheme ? Math.ceil(emojis.length / coverPreviewCount) : 0;
  const fullSetCardsCount = isTiledTheme ? Math.max(tiledCardsCount - 1, 0) : Math.ceil(emojis.length / emojisPerFullCard);

  return (
    <div className="flex flex-col gap-6 text-left pb-20">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4 items-start">
        {/* Controls */}
        <div className="sticky top-24 flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm text-left text-slate-900">
          <div className="space-y-4 text-left">
            <div className="space-y-2 text-left">
              <label className="text-sm font-bold text-slate-500 uppercase">选择合集</label>
              <select
                value={selectedColId || ""}
                onChange={(e) => setSelectedColId(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {collections.map((col) => (
                  <option key={col.id} value={col.id}>{col.title}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 text-left">
              <label className="text-sm font-bold text-slate-500 uppercase">卡片设计主题</label>
              <select
                value={selectedCardThemeId || ""}
                onChange={(e) => setSelectedCardThemeId(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:ring-2 focus:ring-rose-500/20 font-bold"
              >
                {cardThemes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 text-left">
              <label className="text-sm font-bold text-slate-500 uppercase">导出格式</label>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                {(['png', 'jpeg'] as const).map((format) => (
                  <button
                    key={format}
                    onClick={() => setExportFormat(format)}
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                      exportFormat === format ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {format.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
               <button
                onClick={() => exportImage(coverRef, `cover-${selectedColId}`)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-500 py-3 text-xs font-bold text-white hover:bg-rose-600 shadow-lg shadow-rose-100 transition-all"
              >
                <Download className="h-4 w-4" /> {isTiledTheme ? "导出 平铺卡 P1" : "导出 Part 1: 封面卡"}
              </button>
              
              {!isTiledTheme && (
                <>
                  <button
                    onClick={() => exportImage(spreadRef, `spread-${selectedColId}`)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all"
                  >
                    <Download className="h-4 w-4" /> 导出 Part 2: 满铺卡
                  </button>

                  <button
                    onClick={() => exportImage(wechatRef, `wechat-${selectedColId}`)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-500 py-3 text-xs font-bold text-white hover:bg-blue-600 shadow-lg shadow-blue-100 transition-all"
                  >
                    <MessageCircle className="h-4 w-4" /> 导出 Part 3: 微信对话
                  </button>

                  <button
                    onClick={() => exportImage(ipadRef, `ipad-${selectedColId}`)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3 text-xs font-bold text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
                  >
                    <Tablet className="h-4 w-4" /> 导出 Part 3: iPad 平板
                  </button>

                  <button
                    onClick={() => exportImage(pptRef, `ppt-${selectedColId}`)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 py-3 text-xs font-bold text-white hover:bg-orange-700 shadow-lg shadow-orange-100 transition-all"
                  >
                    <Monitor className="h-4 w-4" /> 导出 Part 3: PPT 幻灯片
                  </button>
                </>
              )}

              <div className="h-[1px] bg-slate-100 my-2"></div>

              {isTiledTheme && (
                <button
                  onClick={async () => {
                    const total = fullSetCardsCount + 1;
                    setBulkProgress({ current: 0, total });
                    await exportImage(coverRef, `tiled-${selectedColId}-p1`);
                    setBulkProgress({ current: 1, total });
                    for (let i = 0; i < fullSetCardsCount; i += 1) {
                      await exportImage(fullSetRefs.current[i], `tiled-${selectedColId}-p${i + 2}`);
                      setBulkProgress({ current: i + 2, total });
                    }
                    setTimeout(() => setBulkProgress(null), 1500);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3 text-xs font-bold text-white hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all"
                >
                  <Download className="h-4 w-4" /> 一键导出全部平铺卡
                </button>
              )}

              {isTiledTheme && bulkProgress && (
                <div className="text-[11px] font-semibold text-emerald-600 text-center">
                  导出进度：{bulkProgress.current}/{bulkProgress.total}
                </div>
              )}

              {Array.from({ length: fullSetCardsCount }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => exportImage(fullSetRefs.current[i], `fullset-${selectedColId}-p${i+1}`)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3 text-xs font-bold text-white hover:bg-slate-800 shadow-lg shadow-slate-100 transition-all"
                >
                  <Download className="h-4 w-4" /> {isTiledTheme ? `导出 平铺卡 P${i+2}` : `导出 Part 1: 详情卡 P${i+1}`}
                </button>
              ))}
            </div>

            <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-100 text-left text-amber-700">
              <p className="text-[10px] font-medium leading-relaxed">
                <strong>注：</strong> 由于浏览器限制，导出图片将捕捉 GIF 的静态帧。若需动图，请使用录屏功能或 GIF 截取工具。
              </p>
            </div>
          </div>
        </div>

        {/* Preview Area */}
        <div className="lg:col-span-3 space-y-24">
          
          {/* SECTION 1: COVER & DETAILS */}
          <div className="space-y-12">
            <div className="flex items-center gap-4 text-slate-400">
              <div className="h-[2px] flex-1 bg-slate-200"></div>
              <span className="text-[12px] font-black tracking-[0.3em] uppercase">Part 1: Showcase Design</span>
              <div className="h-[2px] flex-1 bg-slate-200"></div>
            </div>

            {/* 1. COVER CARD */}
            <div className="flex flex-col items-center">
              <div className="mb-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                {isTiledTheme ? "Card 1: Tiled P1" : "Card 1: Cover"}
              </div>
              <div className="relative flex h-[620px] w-full items-center justify-center overflow-hidden rounded-[32px] border-4 border-slate-200 bg-slate-50 shadow-inner">
                <div style={{ transform: "scale(0.65)", transformOrigin: "center center" }}>
                  <div ref={coverRef} style={{ 
                    width: `${cardWidth}px`, 
                    height: `${cardHeight}px`, 
                    backgroundColor: config.bgColor, 
                    display: "flex", 
                    flexDirection: "column", 
                    position: "relative", 
                    borderRadius: "0px", 
                    overflow: "hidden",
                    color: config.textColor,
                    fontFamily: config.fontFamily === 'serif' ? "'Times New Roman', serif" : "system-ui"
                  }} className="shadow-2xl text-left">
                    {isTiledTheme ? (
                      <div className="flex-1 p-6">
                        <div
                          className="grid w-full h-full gap-3"
                          style={{
                            gridTemplateColumns: `repeat(${coverCols}, 1fr)`,
                            gridTemplateRows: `repeat(${coverRows}, 1fr)`,
                          }}
                        >
                          {emojis.slice(0, coverPreviewCount).map((emoji) => (
                            <div
                              key={emoji.id}
                              className="aspect-square flex items-center justify-center overflow-hidden"
                            >
                              <img
                                src={emoji.preview_url || emoji.file_url}
                                alt="emoji"
                                crossOrigin="anonymous"
                                data-src={emoji.preview_url || emoji.file_url}
                                onError={handleEmojiImageError}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="h-3 w-full" style={{ backgroundColor: config.accentColor }}></div>
                        <div className="flex-1 flex flex-col p-8 pt-10 text-left">
                          <div className="flex justify-between items-start mb-6 text-left">
                            <div className="flex flex-col text-left">
                              <div className="flex items-center gap-2 mb-1 text-left">
                                <span className="w-2 h-2 rotate-45" style={{ backgroundColor: config.accentColor }}></span>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-left" style={{ color: config.accentColor }}>{categoryName}</span>
                              </div>
                              <h2 className="text-4xl font-black leading-[1.1] text-left">{selectedCollection?.title || "Emoji Pack"}</h2>
                            </div>
                            <div className="flex flex-col items-end">
                              <div className="px-3 py-1 text-[10px] font-black text-white" style={{ backgroundColor: config.accentColor }}>{selectedCollection?.file_count || 0} Pcs</div>
                              <div className="text-[10px] font-bold mt-1 uppercase tracking-tighter" style={{ color: config.accentColor }}>{activeCardTheme?.name}</div>
                            </div>
                          </div>

                          {config.showFeatured && (
                            <div className="flex gap-6 mb-8 p-4 border text-left" style={{ backgroundColor: "rgba(255,255,255,0.4)", borderColor: config.accentColor + "22" }}>
                              <div className="w-32 h-32 bg-white border-2 flex items-center justify-center relative overflow-hidden shrink-0" style={{ borderColor: config.accentColor + "44" }}>
                                {emojis.length > 0 && <img src={emojis[0].preview_url || emojis[0].file_url} alt="featured" crossOrigin="anonymous" data-src={emojis[0].preview_url || emojis[0].file_url} onError={handleEmojiImageError} className="w-full h-full object-contain" />}
                                <div className="absolute top-0 left-0 text-white text-[8px] font-black px-1.5 py-0.5 uppercase" style={{ backgroundColor: config.accentColor }}>Featured</div>
                              </div>
                              <div className="flex flex-col justify-center text-left">
                                <p className="text-[13px] font-medium leading-relaxed italic mb-2 text-left" style={{ color: config.textColor + "cc" }}>
                                  {`"${selectedCollection?.description || "Collection Preview"}"`}
                                </p>
                                {themeName && <div className="text-[11px] font-black uppercase tracking-widest text-left" style={{ color: config.accentColor }}>Series // {themeName}</div>}
                              </div>
                            </div>
                          )}

                          <div className="flex-1 flex flex-col text-left">
                            <div className="text-[10px] font-black uppercase tracking-[0.3em] mb-3 text-center" style={{ color: config.accentColor + "aa" }}>Pack Preview</div>
                            <div className="grid gap-2 w-full" style={{ gridTemplateColumns: `repeat(${coverCols}, 1fr)` }}>
                              {emojis.slice(0, coverPreviewCount).map((emoji) => (
                                <div 
                                  key={emoji.id} 
                                  className="aspect-square flex items-center justify-center bg-white border-2 overflow-hidden" 
                                  style={{ 
                                    borderColor: config.accentColor + "11",
                                    boxShadow: config.gridStyle === 'sticker' ? `4px 4px 0px ${config.accentColor}11` : 'none'
                                  }}
                                >
                                  <img src={emoji.preview_url || emoji.file_url} alt="emoji" crossOrigin="anonymous" data-src={emoji.preview_url || emoji.file_url} onError={handleEmojiImageError} className="w-full h-full object-contain" />
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="mt-8 pt-6 border-t flex justify-between items-center text-left px-4" style={{ borderColor: config.accentColor + "44" }}>
                            <div className="flex flex-wrap gap-2 max-w-[70%] text-left">
                              {selectedCollection?.tags?.slice(0, 4).map(tag => (
                                <span key={tag.id} className="text-[10px] font-bold px-2 py-0.5" style={{ color: config.accentColor, backgroundColor: config.accentColor + "11" }}>#{tag.name}</span>
                              )) || <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: config.accentColor }}>Verified Pack</span>}
                            </div>
                            <div className="text-white px-4 py-2 text-[12px] font-black tracking-widest" style={{ backgroundColor: config.textColor }}>COLLECT</div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* FULL SET DETAILS */}
            {Array.from({ length: fullSetCardsCount }).map((_, pageIdx) => {
              const tiledOffset = isTiledTheme ? coverPreviewCount : 0;
              const pageStart = tiledOffset + pageIdx * emojisPerFullCard;
              const pageEnd = pageStart + emojisPerFullCard;
              return (
                <div key={pageIdx} className="flex flex-col items-center">
                  <div className="mb-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                    {isTiledTheme ? `Card ${pageIdx + 2}: Tiled P${pageIdx + 2}` : `Card ${pageIdx + 2}: Full Set Details P${pageIdx + 1}`}
                  </div>
                  <div className="relative flex h-[620px] w-full items-center justify-center overflow-hidden rounded-[32px] border-4 border-slate-200 bg-slate-50 shadow-inner">
                    <div style={{ transform: "scale(0.65)", transformOrigin: "center center" }}>
                      <div 
                        ref={el => { fullSetRefs.current[pageIdx] = el; }} 
                        style={{ 
                          width: `${cardWidth}px`, 
                          height: `${cardHeight}px`, 
                          backgroundColor: "#ffffff", 
                          display: "flex", 
                          flexDirection: "column", 
                          position: "relative", 
                          borderRadius: "0px", 
                          overflow: "hidden",
                          color: config.textColor,
                          fontFamily: config.fontFamily === 'serif' ? "'Times New Roman', serif" : "system-ui"
                        }} 
                        className="shadow-2xl text-left"
                      >
                        {isTiledTheme ? (
                          <div className="flex-1 p-6">
                            <div
                              className="grid w-full h-full gap-3"
                              style={{
                                gridTemplateColumns: `repeat(${coverCols}, 1fr)`,
                                gridTemplateRows: `repeat(${coverRows}, 1fr)`,
                              }}
                            >
                              {emojis.slice(pageStart, pageEnd).map((emoji) => (
                                <div key={emoji.id} className="aspect-square flex items-center justify-center overflow-hidden">
                                  <img src={emoji.preview_url || emoji.file_url} alt="emoji" crossOrigin="anonymous" data-src={emoji.preview_url || emoji.file_url} onError={handleEmojiImageError} className="w-full h-full object-contain" />
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="p-8 pb-4 flex justify-between items-end border-b-2 text-left px-10" style={{ borderColor: config.accentColor + "11" }}>
                              <div className="text-left">
                                <div className="text-[10px] font-black uppercase tracking-[0.3em] mb-1 text-left" style={{ color: config.accentColor }}>Full Collection</div>
                                <h3 className="text-2xl font-black tracking-tight text-left">{selectedCollection?.title}</h3>
                              </div>
                              <div className="text-right">
                                <span className="text-[32px] font-black leading-none" style={{ color: config.accentColor + "22" }}>P{pageIdx + 1}</span>
                              </div>
                            </div>

                            <div className="flex-1 p-8 pt-6 flex items-center justify-center">
                              <div
                                className="grid gap-2 w-full"
                                style={{ gridTemplateColumns: `repeat(6, 1fr)` }}
                              >
                                {emojis.slice(pageStart, pageEnd).map((emoji) => (
                                  <div key={emoji.id} className="aspect-square flex items-center justify-center bg-rose-50/20 border border-rose-50/50 overflow-hidden text-left">
                                    <img src={emoji.preview_url || emoji.file_url} alt="emoji" crossOrigin="anonymous" data-src={emoji.preview_url || emoji.file_url} onError={handleEmojiImageError} className="w-full h-full object-contain" />
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="p-8 pt-0 flex justify-between items-center text-left px-10">
                              <div className="flex flex-col text-left">
                                <span className="text-[10px] font-black uppercase tracking-widest text-left" style={{ color: config.accentColor + "66" }}>Page {pageIdx + 1} / {fullSetCardsCount}</span>
                                <span className="text-[10px] font-bold text-left" style={{ color: config.accentColor + "44" }}>Emoji Archive Hub System</span>
                              </div>
                              <div className="w-12 h-1" style={{ backgroundColor: config.accentColor + "22" }}></div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!isTiledTheme && (
            <>
              {/* SECTION 2: FULL SPREAD */}
              <div className="space-y-12">
                <div className="flex items-center gap-4 text-slate-400">
                  <div className="h-[2px] flex-1 bg-slate-200"></div>
                  <span className="text-[12px] font-black tracking-[0.3em] uppercase">Part 2: Full Spread Visual</span>
                  <div className="h-[2px] flex-1 bg-slate-200"></div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="mb-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Card: 6x8 Visual Spread</div>
                  <div className="relative flex h-[620px] w-full items-center justify-center overflow-hidden rounded-[32px] border-4 border-slate-200 bg-slate-50 shadow-inner text-left">
                    <div style={{ transform: "scale(0.65)", transformOrigin: "center center" }}>
                      <div 
                        ref={spreadRef} 
                        style={{ 
                          width: "600px", 
                          height: "800px", 
                          backgroundColor: "#ffffff", 
                          display: "grid", 
                          gridTemplateColumns: "repeat(6, 1fr)",
                          gridTemplateRows: "repeat(8, 1fr)",
                          gap: "4px",
                          padding: "4px",
                          position: "relative", 
                          borderRadius: "0px", 
                          overflow: "hidden"
                        }} 
                        className="shadow-2xl text-left"
                      >
                        {emojis.slice(0, 48).map((emoji) => (
                          <div key={emoji.id} className="aspect-square flex items-center justify-center bg-slate-50/50 overflow-hidden text-left">
                            <img src={emoji.preview_url || emoji.file_url} alt="emoji" crossOrigin="anonymous" data-src={emoji.preview_url || emoji.file_url} onError={handleEmojiImageError} className="w-full h-full object-contain scale-110" />
                          </div>
                        ))}
                        <div className="absolute bottom-4 right-4 bg-black/80 text-white px-2 py-0.5 text-[8px] font-black tracking-widest uppercase">Emoji Hub</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {!isTiledTheme && (
            <div className="space-y-20">
              <div className="flex items-center gap-4 text-slate-400">
                <div className="h-[2px] flex-1 bg-slate-200"></div>
                <span className="text-[12px] font-black tracking-[0.3em] uppercase">Part 3: Scenario Simulation</span>
                <div className="h-[2px] flex-1 bg-slate-200"></div>
              </div>

              {/* 1. WECHAT SCENE */}
              <div className="flex flex-col items-center">
                <div className="mb-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Scenario A: WeChat Chat</div>
                <div className="relative flex h-[620px] w-full items-center justify-center overflow-hidden rounded-[32px] border-4 border-slate-200 bg-slate-50 shadow-inner">
                  <div style={{ transform: "scale(0.65)", transformOrigin: "center center" }}>
                    <div 
                      ref={wechatRef} 
                      style={{ 
                        width: "600px", 
                        height: "800px", 
                        backgroundColor: "#f2f2f2", 
                        display: "flex", 
                        flexDirection: "column",
                        position: "relative", 
                        borderRadius: "0px", 
                        overflow: "hidden"
                      }} 
                      className="shadow-2xl text-left"
                    >
                    <div className="h-16 w-full bg-[#f2f2f2] flex items-center justify-between px-6 border-b border-slate-200 shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-4 border-l-2 border-b-2 border-slate-400 -rotate-45 mb-1"></div>
                        <span className="text-lg font-medium text-slate-900 ml-2">Chatting...</span>
                      </div>
                      <div className="flex gap-1.5"><div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div><div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div><div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div></div>
                    </div>
                    <div className="flex-1 p-6 space-y-8 flex flex-col overflow-hidden text-left">
                      <div className="self-center bg-slate-300/30 px-3 py-1 rounded-md text-[10px] text-slate-400 font-bold tracking-widest uppercase">Today 14:20</div>
                      <div className="flex items-start gap-3 text-left">
                        <div className="w-10 h-10 bg-slate-300 shrink-0 border border-slate-200"></div>
                        <div className="max-w-[70%] bg-white p-3 border border-slate-200 text-slate-800 text-[16px] relative after:content-[''] after:absolute after:top-3 after:-left-[7px] after:w-3 after:h-3 after:bg-white after:border-l after:border-b after:border-slate-200 after:rotate-45">
                          Hey! Do you have any cute emojis for daily chat? I need something sweet! ✨
                        </div>
                      </div>
                      <div className="flex items-start gap-3 flex-row-reverse self-end w-full justify-start text-left">
                        <div className="w-10 h-10 bg-rose-400 shrink-0 border border-rose-300 flex items-center justify-center text-white font-black text-left">Me</div>
                        <div className="mr-3 text-left">
                           {emojis.length > 0 && <img src={emojis[Math.min(1, emojis.length-1)].preview_url || emojis[Math.min(1, emojis.length-1)].file_url} alt="chat-emoji" crossOrigin="anonymous" data-src={emojis[Math.min(1, emojis.length-1)].preview_url || emojis[Math.min(1, emojis.length-1)].file_url} onError={handleEmojiImageError} className="w-32 h-32 object-contain" />}
                        </div>
                      </div>
                      <div className="flex items-start gap-3 flex-row-reverse self-end text-left">
                        <div className="w-10 h-10 bg-rose-400 shrink-0 border border-rose-300 flex items-center justify-center text-white font-black text-left">Me</div>
                        <div className="max-w-[80%] bg-[#95ec69] p-3 border border-[#83d45a] text-slate-900 text-[16px] relative after:content-[''] after:absolute after:top-3 after:-right-[7px] after:w-3 after:h-3 after:bg-[#95ec69] after:border-r after:border-t after:border-[#83d45a] after:rotate-45">
                          {`Sure! I just found this new "${selectedCollection?.title}" pack. It's amazing!`}
                        </div>
                      </div>
                    </div>
                    <div className="h-16 w-full bg-[#f7f7f7] border-t border-slate-200 flex items-center px-4 gap-3 shrink-0">
                      <div className="w-8 h-8 rounded-full border-2 border-slate-400 flex items-center justify-center text-slate-400 font-bold text-[10px]">语音</div>
                      <div className="flex-1 h-10 bg-white border border-slate-200 rounded-sm"></div>
                      <div className="w-8 h-8 flex items-center justify-center text-2xl text-slate-600 font-light">☺</div>
                      <div className="w-8 h-8 flex items-center justify-center text-2xl text-slate-600 font-light">+</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

              {/* 2. IPAD SCENE */}
              <div className="flex flex-col items-center">
                <div className="mb-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Scenario B: iPad Creative Desk</div>
                <div className="relative flex h-[620px] w-full items-center justify-center overflow-hidden rounded-[32px] border-4 border-slate-200 bg-slate-50 shadow-inner">
                  <div style={{ transform: "scale(0.65)", transformOrigin: "center center" }}>
                    <div 
                      ref={ipadRef} 
                      style={{ 
                        width: "600px", 
                        height: "800px", 
                        backgroundColor: "#e2e8f0", 
                        display: "flex", 
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        position: "relative", 
                        borderRadius: "0px", 
                        overflow: "hidden"
                      }} 
                      className="shadow-2xl text-left"
                    >
                    <div className="w-[540px] h-[720px] bg-[#1a1a1a] rounded-[40px] p-4 shadow-2xl flex flex-col relative">
                      <div className="flex-1 bg-white rounded-[24px] overflow-hidden flex flex-col">
                        <div className="h-10 bg-slate-100 flex items-center px-4 gap-2">
                           <div className="w-2.5 h-2.5 rounded-full bg-rose-400"></div>
                           <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                           <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                        </div>
                        <div className="flex-1 flex flex-col p-6 text-left">
                           <div className="flex items-center gap-4 mb-6 text-left">
                              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black">E</div>
                              <div className="flex flex-col text-left">
                                 <h4 className="text-xl font-black text-slate-900 tracking-tight text-left">Design Workspace</h4>
                                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">Emoji Collection Manager</span>
                              </div>
                           </div>
                           <div className="flex-1 grid grid-cols-2 gap-4">
                              <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center p-4">
                                 {emojis.length > 0 && <img src={emojis[0].preview_url || emojis[0].file_url} alt="ipad-main-emoji" crossOrigin="anonymous" data-src={emojis[0].preview_url || emojis[0].file_url} onError={handleEmojiImageError} className="w-full h-full object-contain drop-shadow-xl" />}
                              </div>
                              <div className="flex flex-col gap-4 text-left">
                                 <div className="flex-1 bg-indigo-50 rounded-2xl p-4 flex flex-col text-left">
                                    <span className="text-[10px] font-black text-indigo-400 uppercase mb-2 text-left">Properties</span>
                                    <div className="space-y-1 text-left">
                                       <div className="h-2 w-full bg-indigo-200 rounded-full"></div>
                                       <div className="h-2 w-2/3 bg-indigo-200 rounded-full"></div>
                                    </div>
                                    <div className="mt-auto flex flex-wrap gap-1 text-left">
                                       {selectedCollection?.tags?.slice(0, 3).map(t => <span key={t.id} className="text-[8px] bg-white text-indigo-500 px-1.5 py-0.5 rounded font-bold">#{t.name}</span>)}
                                    </div>
                                 </div>
                                 <div className="h-32 grid grid-cols-3 gap-2 text-left">
                                    {emojis.slice(1, 7).map(e => <div key={e.id} className="bg-white border rounded-lg flex items-center justify-center p-1 text-left"><img src={e.preview_url || e.file_url} alt="ipad-emoji" crossOrigin="anonymous" data-src={e.preview_url || e.file_url} onError={handleEmojiImageError} className="w-full h-full object-contain" /></div>)}
                                 </div>
                              </div>
                           </div>
                           <div className="mt-6 h-12 bg-slate-900 rounded-xl flex items-center justify-between px-6 text-left">
                              <span className="text-[10px] font-black text-white uppercase tracking-widest text-left">Collection Export</span>
                              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center"><div className="w-2 h-2 border-r-2 border-b-2 border-white rotate-45 mb-0.5"></div></div>
                           </div>
                        </div>
                      </div>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

              {/* 3. PPT SCENE */}
              <div className="flex flex-col items-center">
                <div className="mb-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Scenario C: PPT Presentation</div>
                <div className="relative flex h-[620px] w-full items-center justify-center overflow-hidden rounded-[32px] border-4 border-slate-200 bg-slate-50 shadow-inner">
                  <div style={{ transform: "scale(0.65)", transformOrigin: "center center" }}>
                    <div 
                      ref={pptRef} 
                      style={{ 
                        width: "600px", 
                        height: "800px", 
                        backgroundColor: "#ffffff", 
                        display: "flex", 
                        flexDirection: "column",
                        position: "relative", 
                        borderRadius: "0px", 
                        overflow: "hidden"
                      }} 
                      className="shadow-2xl text-left"
                    >
                    <div className="flex-1 flex flex-col p-12 text-left">
                       <div className="mb-12 text-left">
                          <h3 className="text-5xl font-black text-slate-900 tracking-tighter mb-4 leading-none text-left">{selectedCollection?.title}</h3>
                          <div className="flex items-center gap-3 text-left">
                             <div className="h-1.5 w-16 bg-orange-500"></div>
                             <span className="text-[12px] font-black text-slate-400 uppercase tracking-[0.4em] text-left">Asset Showcase</span>
                          </div>
                       </div>
                       <div className="flex-1 grid grid-cols-3 gap-6 text-left">
                          <div className="col-span-2 space-y-8 text-left">
                             <div className="p-6 bg-slate-50 border-l-4 border-orange-500 text-left">
                                <p className="text-xl font-medium text-slate-700 leading-relaxed italic text-left">
                                  {`"${selectedCollection?.description}"`}
                                </p>
                             </div>
                             <div className="grid grid-cols-2 gap-6 text-left">
                                <div className="space-y-4 text-left">
                                   <div className="flex items-center gap-2 text-left">
                                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                      <span className="text-xs font-bold text-slate-900 uppercase text-left">High Resolution</span>
                                   </div>
                                   <div className="flex items-center gap-2 text-left">
                                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                      <span className="text-xs font-bold text-slate-900 uppercase text-left">Alpha Channel</span>
                                   </div>
                                   <div className="flex items-center gap-2 text-left">
                                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                      <span className="text-xs font-bold text-slate-900 uppercase text-left">Multi-Platform</span>
                                   </div>
                                </div>
                                <div className="bg-orange-500 rounded-3xl flex flex-col items-center justify-center text-white p-4">
                                   <span className="text-4xl font-black">{selectedCollection?.file_count}</span>
                                   <span className="text-[10px] font-bold uppercase tracking-widest text-left">Assets</span>
                                </div>
                             </div>
                          </div>
                          <div className="flex flex-col gap-4 text-left">
                             {emojis.slice(0, 3).map(e => <div key={e.id} className="aspect-square bg-slate-100 rounded-3xl flex items-center justify-center p-4 shadow-sm border border-slate-200/50 text-left"><img src={e.preview_url || e.file_url} alt="ppt-emoji" crossOrigin="anonymous" data-src={e.preview_url || e.file_url} onError={handleEmojiImageError} className="w-full h-full object-contain" /></div>)}
                          </div>
                       </div>
                       <div className="mt-12 flex justify-between items-end border-t border-slate-100 pt-8 text-left">
                          <div className="flex flex-col text-left">
                             <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest text-left">Slide 01 / Collection Archive</span>
                             <span className="text-[10px] font-bold text-slate-400 text-left">Internal Presentation Draft 2026</span>
                          </div>
                          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-left"><div className="w-8 h-8 bg-orange-500 rotate-45"></div></div>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
