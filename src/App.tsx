import React, { useState, useRef } from "react";
import {
  Upload,
  Download,
  Image as ImageIcon,
  FileText,
  AlertCircle,
  Check,
  X,
} from "lucide-react";

function App() {
  const [image, setImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>("");
  const [message, setMessage] = useState("");
  const [textFileName, setTextFileName] = useState<string>("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please select a valid image file");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
        setImageName(file.name);
        setError("");
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTextFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const text = await file.text();
        setMessage(text);
        setTextFileName(file.name);
        setError("");
      } catch (err) {
        setError("Failed to read text file");
      }
    }
  };

  const encode = async () => {
    if (!image) {
      setError("Please select an image");
      return;
    }
    if (!message) {
      setError("Please provide a message or select a text file");
      return;
    }

    setIsProcessing(true);
    try {
      const img = new Image();
      img.src = image;
      await new Promise((resolve) => (img.onload = resolve));

      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Add a unique header to identify encoded images
      const header = "STEGO:";
      const binaryMessage =
        (header + message)
          .split("")
          .map((char) => char.charCodeAt(0).toString(2).padStart(8, "0"))
          .join("") + "00000000";

      if (binaryMessage.length > (data.length / 4) * 3) {
        throw new Error("Message too large for this image");
      }

      let binaryIndex = 0;
      for (
        let i = 0;
        i < data.length && binaryIndex < binaryMessage.length;
        i += 4
      ) {
        for (let j = 0; j < 3; j++) {
          if (binaryIndex < binaryMessage.length) {
            data[i + j] =
              (data[i + j] & ~1) | parseInt(binaryMessage[binaryIndex]);
            binaryIndex++;
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);
      setResult(canvas.toDataURL("image/png"));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to encode message");
    } finally {
      setIsProcessing(false);
    }
  };

  const decode = async () => {
    if (!image) {
      setError("Please select an image");
      return;
    }

    setIsProcessing(true);
    try {
      const img = new Image();
      img.src = image;
      await new Promise((resolve) => (img.onload = resolve));

      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      let binaryMessage = "";
      for (let i = 0; i < data.length; i += 4) {
        for (let j = 0; j < 3; j++) {
          binaryMessage += data[i + j] & 1;
        }
      }

      let message = "";
      for (let i = 0; i < binaryMessage.length; i += 8) {
        const byte = binaryMessage.substr(i, 8);
        if (byte === "00000000") break;
        message += String.fromCharCode(parseInt(byte, 2));
      }

      // Check for the header to verify it's an encoded image
      if (!message.startsWith("STEGO:")) {
        throw new Error("This image does not contain a hidden message");
      }

      setResult(message.slice(6)); // Remove the header
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to decode message");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;

    const a = document.createElement("a");
    if (mode === "encode") {
      a.href = result;
      a.download = `encoded_${imageName || "image.png"}`;
    } else {
      const blob = new Blob([result], { type: "text/plain" });
      a.href = URL.createObjectURL(blob);
      a.download = "decoded_message.txt";
    }
    a.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      if (e.currentTarget.id === "image-drop") {
        const file = files[0];
        if (file.type.startsWith("image/")) {
          const input = fileInputRef.current;
          if (input) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            input.files = dataTransfer.files;
            input.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }
      } else if (e.currentTarget.id === "text-drop" && mode === "encode") {
        const file = files[0];
        if (file.type === "text/plain") {
          const input = document.getElementById("textFile") as HTMLInputElement;
          if (input) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            input.files = dataTransfer.files;
            input.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-gray-900 to-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-1 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 leading-relaxed">
            Image Steganography
          </h1>
          <p className="text-gray-400 text-lg font-semibold">
            Hide secret messages within images
          </p>
        </div>

        <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl shadow-2xl p-8 border border-gray-800">
          <div className="flex space-x-4 mb-8">
            <button
              onClick={() => {
                setMode("encode");
                setResult(null);
                setError("");
              }}
              className={`flex-1 flex items-center justify-center px-6 py-3 rounded-lg transition duration-200 ${
                mode === "encode"
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              <Upload className="w-5 h-5 mr-2" />
              Encode
            </button>
            <button
              onClick={() => {
                setMode("decode");
                setResult(null);
                setError("");
              }}
              className={`flex-1 flex items-center justify-center px-6 py-3 rounded-lg transition duration-200 ${
                mode === "decode"
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              <Download className="w-5 h-5 mr-2" />
              Decode
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Image</label>
              <div
                id="image-drop"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
                  image
                    ? "border-green-500/50 bg-green-500/10"
                    : "border-gray-600 hover:border-gray-500 hover:bg-gray-800/50"
                }`}
              >
                {image ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center space-x-2 text-green-500">
                      <Check className="w-5 h-5" />
                      <span>{imageName}</span>
                    </div>
                    <img
                      src={image}
                      alt="Selected"
                      className="max-h-48 mx-auto rounded-lg"
                    />
                  </div>
                ) : (
                  <>
                    <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                    <p className="text-gray-400">
                      Drop an image here or click to select
                    </p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
            </div>

            {mode === "encode" && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Message
                </label>
                <div className="space-y-4">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full h-32 px-4 py-3 bg-gray-800 rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all duration-200"
                    placeholder="Enter your secret message..."
                  />
                  <div className="text-center">
                    <span className="text-gray-400">or</span>
                  </div>
                  <div
                    id="text-drop"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById("textFile")?.click()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 ${
                      textFileName
                        ? "border-green-500/50 bg-green-500/10"
                        : "border-gray-600 hover:border-gray-500 hover:bg-gray-800/50"
                    }`}
                  >
                    {textFileName ? (
                      <div className="flex items-center justify-center space-x-2 text-green-500">
                        <Check className="w-5 h-5" />
                        <span>{textFileName}</span>
                      </div>
                    ) : (
                      <>
                        <FileText className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                        <p className="text-gray-400">
                          Drop a text file here or click to select
                        </p>
                      </>
                    )}
                    <input
                      id="textFile"
                      type="file"
                      accept=".txt"
                      onChange={handleTextFileChange}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center text-red-400 bg-red-900/20 p-4 rounded-lg border border-red-900/50">
                <X className="w-5 h-5 mr-2 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <button
              onClick={mode === "encode" ? encode : decode}
              disabled={isProcessing}
              className={`w-full py-4 px-6 rounded-lg flex items-center justify-center space-x-2 transition-all duration-200 ${
                isProcessing
                  ? "bg-gray-700 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
              }`}
            >
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : mode === "encode" ? (
                <Upload className="w-5 h-5 mr-2" />
              ) : (
                <Download className="w-5 h-5 mr-2" />
              )}
              <span>
                {isProcessing
                  ? "Processing..."
                  : mode === "encode"
                  ? "Encode Message"
                  : "Decode Message"}
              </span>
            </button>

            {result && (
              <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-medium">Result</label>
                  <button
                    onClick={handleDownload}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                </div>
                {mode === "encode" ? (
                  <img
                    src={result}
                    alt="Encoded"
                    className="max-w-full h-auto rounded-lg border border-gray-700"
                  />
                ) : (
                  <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                    <pre className="whitespace-pre-wrap text-gray-300">
                      {result}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
