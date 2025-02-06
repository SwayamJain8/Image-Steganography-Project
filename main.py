import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from PIL import Image, ImageTk
import os
from pathlib import Path
 
class SteganographyApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Image Steganography")
        self.root.geometry("1000x600")
        self.root.configure(bg="#1e1e2e")
        
        # Style configuration
        style = ttk.Style()
        style.theme_use('default')
        style.configure('TFrame', background='#1e1e2e')
        style.configure('TButton', 
                       padding=10, 
                       background='#7aa2f7',
                       foreground='black')
        style.configure('TLabel', 
                       background='#1e1e2e',
                       foreground='white',
                       font=('Helvetica', 10))
        
        self.create_widgets()
        
    def create_widgets(self):
        # Main container
        main_frame = ttk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)
        
        # Title
        title_label = ttk.Label(
            main_frame, 
            text="Image Steganography", 
            font=('Helvetica', 24, 'bold')
        )
        title_label.pack(pady=(0, 20))
        
        # Image preview frame
        self.preview_frame = ttk.Frame(main_frame)
        self.preview_frame.pack(fill=tk.BOTH, expand=True)
        
        # Image preview label
        self.image_label = ttk.Label(self.preview_frame)
        self.image_label.pack(pady=10)
        
        # Buttons frame
        buttons_frame = ttk.Frame(main_frame)
        buttons_frame.pack(fill=tk.X, pady=20)
        
        # Encode section
        encode_frame = ttk.LabelFrame(buttons_frame, text="Encode", padding=10)
        encode_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=5)
        
        ttk.Button(
            encode_frame,
            text="Select Image",
            command=self.select_image
        ).pack(fill=tk.X, pady=5)
        
        ttk.Button(
            encode_frame,
            text="Select Text File",
            command=self.select_text_file
        ).pack(fill=tk.X, pady=5)
        
        ttk.Button(
            encode_frame,
            text="Encode Message",
            command=self.encode_message
        ).pack(fill=tk.X, pady=5)
        
        # Decode section
        decode_frame = ttk.LabelFrame(buttons_frame, text="Decode", padding=10)
        decode_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=5)
        
        ttk.Button(
            decode_frame,
            text="Select Image",
            command=self.select_encoded_image
        ).pack(fill=tk.X, pady=5)
        
        ttk.Button(
            decode_frame,
            text="Decode Message",
            command=self.decode_message
        ).pack(fill=tk.X, pady=5)
        
        # Status bar
        self.status_var = tk.StringVar()
        status_bar = ttk.Label(
            main_frame,
            textvariable=self.status_var,
            font=('Helvetica', 10)
        )
        status_bar.pack(pady=10)
        
        self.image_path = None
        self.text_path = None
        self.encoded_image_path = None
        
    def select_image(self):
        file_path = filedialog.askopenfilename(
            filetypes=[("Image files", "*.png *.jpg *.jpeg *.bmp")]
        )
        if file_path:
            self.image_path = file_path
            self.show_preview(file_path)
            self.status_var.set(f"Selected image: {Path(file_path).name}")
            
    def select_text_file(self):
        file_path = filedialog.askopenfilename(
            filetypes=[("Text files", "*.txt")]
        )
        if file_path:
            self.text_path = file_path
            self.status_var.set(f"Selected text file: {Path(file_path).name}")
            
    def select_encoded_image(self):
        file_path = filedialog.askopenfilename(
            filetypes=[("PNG files", "*.png")]
        )
        if file_path:
            self.encoded_image_path = file_path
            self.show_preview(file_path)
            self.status_var.set(f"Selected encoded image: {Path(file_path).name}")
            
    def show_preview(self, image_path):
        image = Image.open(image_path)
        # Resize image to fit the window while maintaining aspect ratio
        display_size = (400, 300)
        image.thumbnail(display_size, Image.Resampling.LANCZOS)
        photo = ImageTk.PhotoImage(image)
        self.image_label.configure(image=photo)
        self.image_label.image = photo
        
    def encode_message(self):
        if not self.image_path or not self.text_path:
            messagebox.showerror(
                "Error",
                "Please select both an image and a text file"
            )
            return
            
        try:
            # Read the text file
            with open(self.text_path, 'r') as file:
                message = file.read()
                
            # Open the image
            img = Image.open(self.image_path)
            
            # Convert image to RGB if it's not
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Get the pixels
            pixels = list(img.getdata())
            
            # Convert message to binary
            binary_message = ''.join(format(ord(char), '08b') for char in message)
            binary_message += '00000000'  # Add delimiter
            
            if len(binary_message) > len(pixels) * 3:
                raise ValueError("Message too large for this image")
            
            # Encode the message
            new_pixels = []
            binary_message_index = 0
            
            for pixel in pixels:
                new_pixel = list(pixel)
                
                for color_channel in range(3):
                    if binary_message_index < len(binary_message):
                        # Replace the least significant bit
                        new_pixel[color_channel] = (
                            new_pixel[color_channel] & ~1 |
                            int(binary_message[binary_message_index])
                        )
                        binary_message_index += 1
                
                new_pixels.append(tuple(new_pixel))
            
            # Create new image with encoded message
            new_image = Image.new(img.mode, img.size)
            new_image.putdata(new_pixels)
            
            # Save the encoded image
            save_path = filedialog.asksaveasfilename(
                defaultextension=".png",
                filetypes=[("PNG files", "*.png")]
            )
            
            if save_path:
                new_image.save(save_path)
                self.status_var.set("Message encoded successfully!")
                self.show_preview(save_path)
                
        except Exception as e:
            messagebox.showerror("Error", str(e))
            
    def decode_message(self):
        if not self.encoded_image_path:
            messagebox.showerror("Error", "Please select an encoded image")
            return
            
        try:
            # Open the image
            img = Image.open(self.encoded_image_path)
            pixels = list(img.getdata())
            
            # Extract the binary message
            binary_message = ''
            for pixel in pixels:
                for color_channel in pixel:
                    binary_message += str(color_channel & 1)
            
            # Convert binary to text
            message = ''
            for i in range(0, len(binary_message), 8):
                byte = binary_message[i:i+8]
                if byte == '00000000':  # Check for delimiter
                    break
                message += chr(int(byte, 2))
            
            # Save the decoded message
            save_path = filedialog.asksaveasfilename(
                defaultextension=".txt",
                filetypes=[("Text files", "*.txt")]
            )
            
            if save_path:
                with open(save_path, 'w') as file:
                    file.write(message)
                self.status_var.set("Message decoded successfully!")
                
        except Exception as e:
            messagebox.showerror("Error", str(e))

if __name__ == "__main__":
    root = tk.Tk()
    app = SteganographyApp(root)
    root.mainloop()