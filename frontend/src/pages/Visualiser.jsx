import { useState, useEffect, useRef } from 'react';
import { Upload, Camera, Download, Save, RotateCcw, ZoomIn, ZoomOut, Move, Trash2, ChevronLeft, ChevronRight, Grid3X3, Image as ImageIcon } from 'lucide-react';
import { API } from '../api';

export default function VisualizerPage() {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [roomImage, setRoomImage] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [visualizations, setVisualizations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('create'); // create | gallery
  
  // Canvas overlay state
  const [overlayPos, setOverlayPos] = useState({ x: 50, y: 50 });
  const [overlayScale, setOverlayScale] = useState(1);
  const [overlayRotation, setOverlayRotation] = useState(0);
  const [overlayOpacity, setOverlayOpacity] = useState(0.85);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    loadCustomers();
    loadProducts();
    loadVisualizations();
  }, []);

  async function loadCustomers() {
    try {
      const data = await API.getCustomers();
      setCustomers(data.customers || data);
    } catch (e) { console.error(e); }
  }

  async function loadProducts() {
    try {
      const data = await API.getProducts();
      setProducts(data || []);
    } catch (e) { console.error(e); }
  }

  async function loadVisualizations() {
    try {
      const data = await API.getVisualizations();
      setVisualizations(data || []);
    } catch (e) { console.error(e); }
  }

  function handleRoomUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setRoomImage(event.target.result);
      setOverlayPos({ x: 50, y: 50 });
      setOverlayScale(1);
      setOverlayRotation(0);
    };
    reader.readAsDataURL(file);
  }

  function handleMouseDown(e) {
    if (!selectedProduct || !roomImage) return;
    setIsDragging(true);
    const rect = containerRef.current.getBoundingClientRect();
    setDragStart({
      x: e.clientX - rect.left - overlayPos.x,
      y: e.clientY - rect.top - overlayPos.y
    });
  }

  function handleMouseMove(e) {
    if (!isDragging) return;
    const rect = containerRef.current.getBoundingClientRect();
    setOverlayPos({
      x: e.clientX - rect.left - dragStart.x,
      y: e.clientY - rect.top - dragStart.y
    });
  }

  function handleMouseUp() {
    setIsDragging(false);
  }

  function drawCanvas() {
    const canvas = canvasRef.current;
    if (!canvas || !roomImage || !selectedProduct) return;
    
    const ctx = canvas.getContext('2d');
    const roomImg = new Image();
    const productImg = new Image();
    
    roomImg.onload = () => {
      canvas.width = roomImg.width;
      canvas.height = roomImg.height;
      ctx.drawImage(roomImg, 0, 0);
      
      productImg.onload = () => {
        ctx.save();
        ctx.globalAlpha = overlayOpacity;
        ctx.translate(overlayPos.x, overlayPos.y);
        ctx.rotate((overlayRotation * Math.PI) / 180);
        ctx.scale(overlayScale, overlayScale);
        ctx.drawImage(productImg, -productImg.width / 2, -productImg.height / 2);
        ctx.restore();
      };
      productImg.src = selectedProduct.image || selectedProduct.photo || '';
    };
    roomImg.src = roomImage;
  }

  useEffect(() => {
    drawCanvas();
  }, [roomImage, selectedProduct, overlayPos, overlayScale, overlayRotation, overlayOpacity]);

  async function saveVisualization() {
    if (!canvasRef.current || !selectedProduct) return;
    setLoading(true);
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const blob = await (await fetch(dataUrl)).blob();
      const formData = new FormData();
      formData.append('image', blob, 'visualization.png');
      formData.append('product_id', selectedProduct.id);
      formData.append('product_name', selectedProduct.name);
      
      await API.createVisualization(formData);
      loadVisualizations();
      setActiveTab('gallery');
    } catch (e) {
      alert('Failed to save: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  function downloadVisualization() {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `room-visual-${selectedProduct?.name?.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  }

  return (
    <div className="px-5 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Room Visualizer</h1>
          <p className="text-sm text-white/40 mt-1">Show customers their room with your carpets & flooring</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('create')} 
            className={`px-4 py-2 rounded-xl text-sm ${activeTab === 'create' ? 'btn-primary' : 'bg-white/5 hover:bg-white/10'}`}
          >
            <Camera className="w-4 h-4 inline mr-1" /> Create
          </button>
          <button 
            onClick={() => setActiveTab('gallery')} 
            className={`px-4 py-2 rounded-xl text-sm ${activeTab === 'gallery' ? 'btn-primary' : 'bg-white/5 hover:bg-white/10'}`}
          >
            <ImageIcon className="w-4 h-4 inline mr-1" /> Gallery
          </button>
        </div>
      </div>

      {activeTab === 'create' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left Panel - Upload & Products */}
          <div className="space-y-4">
            {/* Room Upload */}
            <div className="card glass p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Upload className="w-4 h-4" /> Room Photo
              </h3>
              {roomImage ? (
                <div className="relative">
                  <img src={roomImage} alt="Room" className="w-full h-40 object-cover rounded-xl" />
                  <button 
                    onClick={() => setRoomImage(null)}
                    className="absolute top-2 right-2 p-1.5 bg-red-500/80 rounded-lg text-white"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-white/40 transition-colors">
                  <Upload className="w-8 h-8 text-white/30 mb-2" />
                  <span className="text-sm text-white/40">Upload room photo</span>
                  <input type="file" accept="image/*" onChange={handleRoomUpload} className="hidden" />
                </label>
              )}
            </div>

            {/* Product Selection */}
            <div className="card glass p-4">
              <h3 className="font-semibold mb-3">Select Product</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {products.map(product => (
                  <button
                    key={product.id}
                    onClick={() => setSelectedProduct(product)}
                    className={`w-full flex items-center gap-3 p-2 rounded-xl transition-colors text-left ${
                      selectedProduct?.id === product.id ? 'bg-amber-500/20 border border-amber-500/30' : 'hover:bg-white/5'
                    }`}
                  >
                    {product.image || product.photo ? (
                      <img src={product.image || product.photo} alt={product.name} className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                        <Grid3X3 className="w-5 h-5 text-white/30" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-white/40">{product.supplier || product.category}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Center - Canvas Preview */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card glass p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Preview</h3>
                <div className="flex gap-2">
                  {roomImage && selectedProduct && (
                    <>
                      <button onClick={downloadVisualization} className="p-2 bg-white/5 rounded-lg hover:bg-white/10" title="Download">
                        <Download className="w-4 h-4" />
                      </button>
                      <button onClick={saveVisualization} disabled={loading} className="btn-primary px-3 py-2 text-sm flex items-center gap-1">
                        {loading ? 'Saving...' : <><Save className="w-4 h-4" /> Save to Gallery</>}
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <div 
                ref={containerRef}
                className="relative bg-black/30 rounded-xl overflow-hidden min-h-[400px] flex items-center justify-center cursor-crosshair"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {roomImage && selectedProduct ? (
                  <canvas 
                    ref={canvasRef}
                    className="max-w-full max-h-[500px]"
                    style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                  />
                ) : (
                  <div className="text-center py-20">
                    <ImageIcon className="w-16 h-16 text-white/20 mx-auto mb-3" />
                    <p className="text-white/40">
                      {!roomImage ? 'Upload a room photo to start' : 'Select a product to visualize'}
                    </p>
                  </div>
                )}
              </div>

              {/* Overlay Controls */}
              {roomImage && selectedProduct && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-white/40 block mb-1">Scale</label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setOverlayScale(s => Math.max(0.1, s - 0.1))} className="p-1 bg-white/5 rounded hover:bg-white/10">
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm w-12 text-center">{overlayScale.toFixed(1)}x</span>
                      <button onClick={() => setOverlayScale(s => s + 0.1)} className="p-1 bg-white/5 rounded hover:bg-white/10">
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-white/40 block mb-1">Rotation</label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setOverlayRotation(r => r - 15)} className="p-1 bg-white/5 rounded hover:bg-white/10">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm w-12 text-center">{overlayRotation}°</span>
                      <button onClick={() => setOverlayRotation(r => r + 15)} className="p-1 bg-white/5 rounded hover:bg-white/10">
                        <RotateCcw className="w-3.5 h-3.5 scale-x-[-1]" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-white/40 block mb-1">Opacity</label>
                    <input 
                      type="range" min="0.1" max="1" step="0.05" 
                      value={overlayOpacity}
                      onChange={e => setOverlayOpacity(parseFloat(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 block mb-1">Position</label>
                    <button onClick={() => setOverlayPos({ x: 50, y: 50 })} className="text-xs bg-white/5 px-2 py-1 rounded hover:bg-white/10">
                      <Move className="w-3.5 h-3.5 inline mr-1" /> Reset
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Gallery Tab */
        <div>
          {visualizations.length === 0 ? (
            <div className="card glass text-center py-16">
              <ImageIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <p className="text-white/40 text-lg">No visualizations yet</p>
              <p className="text-sm text-white/30 mt-2">Create your first room visualization and it will appear here</p>
              <button onClick={() => setActiveTab('create')} className="btn-primary mt-4 px-4 py-2">
                <Camera className="w-4 h-4 inline mr-1" /> Create Visualization
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {visualizations.map(viz => (
                <div key={viz.id} className="card glass overflow-hidden group">
                  <div className="relative aspect-square">
                    <img src={viz.image_url} alt={viz.product_name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <a href={viz.image_url} download className="p-2 bg-white/20 rounded-lg hover:bg-white/30">
                        <Download className="w-5 h-5" />
                      </a>
                      <button onClick={() => {/* share */}} className="p-2 bg-white/20 rounded-lg hover:bg-white/30">
                        <Camera className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="font-medium text-sm truncate">{viz.product_name}</p>
                    <p className="text-xs text-white/40">{viz.created_at?.split('T')[0]}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
