import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Image as ImageIcon, Plus } from 'lucide-react';
import { API } from '../api';

export default function Visualiser() {
  const navigate = useNavigate();
  const [photo, setPhoto] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      const res = await API.getProducts();
      setProducts(res);
    } catch (e) {
      console.error(e);
    }
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setPhoto(ev.target.result);
      setSelectedProduct(null);
      setResultUrl(null);
    };
    reader.readAsDataURL(file);
  }

  function generateOverlay() {
    if (!photo || !selectedProduct) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      ctx.fillStyle = '#8B6914';
      ctx.globalAlpha = 0.35;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 48px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 8;
      ctx.fillText(selectedProduct.name, canvas.width / 2, canvas.height / 2);
      setResultUrl(canvas.toDataURL('image/png'));
    };
    img.src = photo;
  }

  useEffect(() => {
    if (photo && selectedProduct) {
      generateOverlay();
    }
  }, [selectedProduct]);

  return (
    <div className="px-5 pt-6 pb-4">
      <h1 className="text-2xl font-bold mb-4">Room Visualiser</h1>

      {/* Upload */}
      <div className="card glass p-5 mb-4 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        {!photo ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-8 border-2 border-dashed border-white/10 rounded-2xl hover:border-amber-400/50 transition-colors flex flex-col items-center gap-2"
          >
            <Upload className="w-8 h-8 text-white/30" />
            <span className="text-sm text-white/40">Upload a room photo</span>
          </button>
        ) : (
          <div className="space-y-3">
            <img src={photo} className="w-full rounded-xl object-cover max-h-64" alt="Room" />
            <button onClick={() => fileInputRef.current?.click()} className="text-xs text-amber-400">Change photo</button>
          </div>
        )}
      </div>

      {/* Product Selector */}
      {photo && (
        <div className="mb-4">
          <h2 className="font-semibold mb-3">Select Product</h2>
          <div className="grid grid-cols-3 gap-2">
            {products.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedProduct(p)}
                className={`p-2 rounded-xl border text-xs text-center transition-all ${selectedProduct?.id === p.id ? 'border-amber-400 bg-amber-400/10' : 'border-white/10 hover:border-white/20'}`}
              >
                {p.image && <img src={p.image} className="w-full h-12 object-cover rounded-lg mb-1" alt="" />}
                <p className="font-medium truncate">{p.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hidden canvas for generation */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Result */}
      {resultUrl && (
        <div className="card glass p-4 mb-4">
          <h2 className="font-semibold mb-3">Preview</h2>
          <img src={resultUrl} className="w-full rounded-xl mb-3" alt="Visualisation" />
          <button onClick={() => navigate('/quotes')} className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Create Quote
          </button>
        </div>
      )}
    </div>
  );
}
