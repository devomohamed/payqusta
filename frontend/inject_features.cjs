const fs = require('fs');
const path = require('path');

const prodFile = path.resolve(__dirname, 'src/pages/ProductsPage.jsx');
let text = fs.readFileSync(prodFile, 'utf8');

// 1. Imports
const importsTarget = "import ProductSearchModal from '../components/ProductSearchModal';";
if (!text.includes("import SeoAnalyzer")) {
    text = text.replace(importsTarget, importsTarget + "\nimport SeoAnalyzer from '../components/products/SeoAnalyzer';\nimport ImageEditorModal from '../components/products/ImageEditorModal';");
}

// 2. States
const statesTarget = "const [branches, setBranches] = useState([]);";
if (!text.includes("const [showImageEditor")) {
    text = text.replace(statesTarget, statesTarget + "\n  const [showImageEditor, setShowImageEditor] = useState(false);\n  const [editorFiles, setEditorFiles] = useState([]);");
}

// 3. handleImageUpload replacing
const uploadFunctionMatch = text.match(/\/\/ Upload image\s+const handleImageUpload = async \(e\) => \{[\s\S]*?e\.target\.value = '';\s+\}\s+\};/);
const replacementUpload = `
  // Intercept Image Upload to show the Cropper First
  const handleImageUpload = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      if (!files[i].type.startsWith('image/')) return toast.error('الملفات يجب أن تكون صور فقط');
      if (files[i].size > 20 * 1024 * 1024) return toast.error('حجم الصورة يجب ألا يتجاوز 20MB');
    }

    setEditorFiles(Array.from(files));
    setShowImageEditor(true);
    e.target.value = ''; // Reset input
  };

  // Called after images have been cropped/skipped in the ImageEditorModal
  const handleEditorComplete = async (processedFiles) => {
    setShowImageEditor(false);
    setEditorFiles([]);

    if (!processedFiles || processedFiles.length === 0) return;

    if (editId) {
      setUploadingImage(true);
      try {
        const formData = new FormData();
        for (let i = 0; i < processedFiles.length; i++) {
          formData.append('images', processedFiles[i]);
        }
        formData.append('setAsThumbnail', productImages.length === 0 ? 'true' : 'false');

        const res = await productsApi.uploadImage(editId, formData);
        const newImages = res.data.data.images || [res.data.data.image];
        setProductImages([...productImages, ...newImages]);
        toast.success("تم رفع الصور بنجاح ✅");
      } catch (err) {
        toast.error("خطأ في رفع الصور");
      } finally {
        setUploadingImage(false);
      }
    } else {
      setPendingImages([...pendingImages, ...processedFiles]);
      toast.success("تم إعداد الصور (سيتم الرفع عند الحفظ)");
    }
  };
`;
if (uploadFunctionMatch) {
    text = text.replace(uploadFunctionMatch[0], replacementUpload.trim());
}

// 4. Inject SeoAnalyzer
const rteTarget = `<RichTextEditor
                      label="وصف المنتج"
                      value={form.description}
                      onChange={(content) => setForm({ ...form, description: content })}
                    />`;
if (!text.includes("<SeoAnalyzer")) {
    text = text.replace(rteTarget, rteTarget + '\n                    <div className="mt-2">\n                      <SeoAnalyzer form={form} />\n                    </div>');
}

// 5. Inject ImageEditorModal at the end
if (!text.includes("<ImageEditorModal")) {
    const endTarget = `    </div>\n  );\n}`;
    text = text.replace(endTarget, `      <ImageEditorModal\n        isOpen={showImageEditor}\n        onClose={() => setShowImageEditor(false)}\n        files={editorFiles}\n        onComplete={handleEditorComplete}\n      />\n    </div>\n  );\n}`);
}

fs.writeFileSync(prodFile, text, 'utf8');
console.log("Successfully injected features into ProductsPage.jsx");
