import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  Modal,
  Alert,
  Platform,
  Linking
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// استيراد الشعار وأيقونة الواتساب من المجلد tt مباشرة
import LogoImage from './tt/c01.png';
import WhatsappIcon from './tt/c02.png';

// استيراد قاعدة البيانات من ملف firebase.js
import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  onSnapshot 
} from 'firebase/firestore';

const COMMON_COLORS = ['أسود', 'أبيض', 'أحمر', 'أزرق', 'أخضر', 'أصفر', 'رمادي', 'بني', 'بيج', 'وردي', 'كحلي'];
const COMMON_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '4XL', '5XL', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48'];

// --- دالة ضغط وتصغير الأبعاد مع إمكانية تحديد الجودة بحرية ---
const compressAndResizeBase64 = (uri, maxWidth = 400, maxHeight = 400, quality = 0.3) => {
  return new Promise((resolve) => {
    if (Platform.OS !== 'web') {
      resolve(uri);
      return;
    }

    const img = new window.Image();
    img.src = uri;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((height * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedBase64);
    };
    img.onerror = () => {
      resolve(uri);
    };
  });
};

export default function App() {
  const [currentTab, setCurrentTab] = useState('offers');

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cartItems, setCartItems] = useState([]); 

  // حالة حماية صفحة كود
  const [isCodeUnlocked, setIsCodeUnlocked] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [enteredCodeInput, setEnteredCodeInput] = useState('');

  // --- جلب المنتجات والطلبات بشكل حي وفوري من الـ Collections المخصصة ---
  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const list = snapshot.docs.map(docItem => ({ id: docItem.id, ...docItem.data() }));
      setProducts(list);
    }, (error) => {
      console.error("خطأ في جلب المنتجات:", error);
    });

    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const list = snapshot.docs.map(docItem => ({ id: docItem.id, ...docItem.data() }));
      setOrders(list);
    }, (error) => {
      console.error("خطأ في جلب الطلبات:", error);
    });

    return () => {
      unsubProducts();
      unsubOrders();
    };
  }, []);

  // --- استمارة الإعدادات ---
  const [productImages, setProductImages] = useState([]);
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [selectedColorsForNewProduct, setSelectedColorsForNewProduct] = useState([]);
  const [selectedSizesForNewProduct, setSelectedSizesForNewProduct] = useState([]);
  const [colorImages, setColorImages] = useState({});

  // --- نافذة تعديل السعر والخصم للمنتج ---
  const [editingProduct, setEditingProduct] = useState(null);
  const [editPriceInput, setEditPriceInput] = useState('');
  const [editDiscountInput, setEditDiscountInput] = useState('');

  // --- النافذة المنبثقة للتفاصيل ---
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeMainImage, setActiveMainImage] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);

  // --- استمارة الشراء ---
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // دالة فتح رابط الواتساب
  const openWhatsApp = () => {
    const url = 'https://wa.me/212713437921';
    Linking.openURL(url).catch((err) => console.error('An error occurred', err));
  };

  // التحقق من الكود المدخل لفتح صفحة كود
  const handleVerifyCode = () => {
    if (enteredCodeInput.trim() === 'tokyo@@2027') {
      setIsCodeUnlocked(true);
      setShowCodeModal(false);
      setEnteredCodeInput('');
    } else {
      alert('الكود غير صحيح، يرجى المحاولة مرة أخرى.');
    }
  };

  const handleTabChange = (tabName) => {
    if (tabName === 'settings') {
      if (!isCodeUnlocked) {
        setShowCodeModal(true);
        return;
      }
    }
    setCurrentTab(tabName);
  };

  // حساب التكاليف
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let shippingCost = 0;
  if (subtotal > 0 && subtotal < 50) {
    shippingCost = 40;
  } else if (subtotal >= 50 && subtotal <= 250) {
    shippingCost = 30;
  } else if (subtotal > 250) {
    shippingCost = 0;
  }
  const finalTotal = subtotal + shippingCost;

  const formatDiscountLabel = (discount) => {
    if (!discount) return '';
    const cleanStr = discount.trim();
    if (!cleanStr || cleanStr === '0') return '';
    
    if (/^\d+$/.test(cleanStr)) {
      return `خصم ${cleanStr}%-`;
    }
    return cleanStr;
  };

  const pickImages = async () => {
    try {
      const mediaTypesOption = ImagePicker.MediaType ? ImagePicker.MediaType.Images : ImagePicker.MediaTypeOptions.Images;
      
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaTypesOption,
        allowsMultipleSelection: true,
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets) {
        const processedImages = [];
        for (let asset of result.assets) {
          const rawUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
          const compressed = await compressAndResizeBase64(rawUri, 400, 400, 0.6);
          processedImages.push(compressed);
        }
        setProductImages((prev) => [...prev, ...processedImages]);
      }
    } catch (e) {
      alert('تعذر اختيار الصور.');
    }
  };

  const pickImageForColor = async (color) => {
    try {
      const mediaTypesOption = ImagePicker.MediaType ? ImagePicker.MediaType.Images : ImagePicker.MediaTypeOptions.Images;

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaTypesOption,
        quality: 0.2,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const rawUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        const compressed = await compressAndResizeBase64(rawUri, 240, 240, 0.3);
        setColorImages((prev) => ({ ...prev, [color]: compressed }));
      }
    } catch (e) {
      alert('تعذر اختيار الصورة.');
    }
  };

  const toggleColorSelection = (color) => {
    if (selectedColorsForNewProduct.includes(color)) {
      setSelectedColorsForNewProduct(selectedColorsForNewProduct.filter((c) => c !== color));
      const updatedColorImages = { ...colorImages };
      delete updatedColorImages[color];
      setColorImages(updatedColorImages);
    } else {
      setSelectedColorsForNewProduct([...selectedColorsForNewProduct, color]);
    }
  };

  const toggleSizeSelection = (size) => {
    if (selectedSizesForNewProduct.includes(size)) {
      setSelectedSizesForNewProduct(selectedSizesForNewProduct.filter((s) => s !== size));
    } else {
      setSelectedSizesForNewProduct([...selectedSizesForNewProduct, size]);
    }
  };

  const handleResetForm = () => {
    setProductImages([]);
    setProductName('');
    setProductDescription('');
    setProductPrice('');
    setSelectedColorsForNewProduct([]);
    setSelectedSizesForNewProduct([]);
    setColorImages({});
  };

  const handleAddProduct = async () => {
    const trimmedName = productName ? productName.trim() : '';
    const trimmedDescription = productDescription ? productDescription.trim() : '';
    const trimmedPriceStr = productPrice ? productPrice.toString().trim().replace(',', '.') : '';

    if (!trimmedName) {
      alert('يرجى إدخال اسم المنتج.');
      return;
    }

    if (!trimmedPriceStr) {
      alert('يرجى إدخال سعر المنتج.');
      return;
    }

    const parsedPrice = parseFloat(trimmedPriceStr);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      alert('يرجى إدخال سعر رقمي صحيح.');
      return;
    }

    try {
      const cleanImages = Array.isArray(productImages) 
        ? productImages.filter((img) => typeof img === 'string' && img.length > 0).map(String)
        : [];

      const cleanColors = Array.isArray(selectedColorsForNewProduct)
        ? selectedColorsForNewProduct.filter((c) => typeof c === 'string').map(String)
        : [];

      const cleanSizes = Array.isArray(selectedSizesForNewProduct)
        ? selectedSizesForNewProduct.filter((s) => typeof s === 'string').map(String)
        : [];

      const cleanColorImagesList = [];
      if (colorImages && typeof colorImages === 'object') {
        Object.keys(colorImages).forEach((colorKey) => {
          const imgUrl = colorImages[colorKey];
          if (imgUrl && typeof imgUrl === 'string' && imgUrl.trim().length > 0) {
            cleanColorImagesList.push(`${colorKey}:${imgUrl}`);
          }
        });
      }

      const newProduct = {
        images: cleanImages,
        name: String(trimmedName),
        description: String(trimmedDescription),
        price: Number(parsedPrice),
        discount: '',
        colors: cleanColors,
        sizes: cleanSizes,
        colorImagesList: cleanColorImagesList,
        isOutOfStock: false,
        createdAt: Number(Date.now()),
      };

      await addDoc(collection(db, 'products'), newProduct);
      handleResetForm();
      alert('تمت إضافة المنتج بنجاح إلى قاعدة البيانات!');
    } catch (e) {
      console.error("خطأ الحفظ:", e);
      alert("حدث خطأ أثناء الحفظ: " + e.message);
    }
  };

  const handleOpenEditPriceModal = (product) => {
    setEditingProduct(product);
    setEditPriceInput(product.price.toString());
    setEditDiscountInput(product.discount || '');
  };

  const handleSavePriceAndDiscount = async () => {
    if (!editingProduct) return;
    const newPrice = parseFloat(editPriceInput.replace(',', '.'));

    if (isNaN(newPrice) || newPrice <= 0) {
      alert('يرجى إدخال سعر صحيح.');
      return;
    }

    try {
      const productRef = doc(db, 'products', editingProduct.id);
      await updateDoc(productRef, {
        price: newPrice,
        discount: editDiscountInput.trim()
      });
      setEditingProduct(null);
      alert('تم تحديث السعر والخصم بنجاح!');
    } catch (e) {
      alert('فشل التحديث.');
    }
  };

  const handleToggleStockStatus = async (productId, currentStatus) => {
    try {
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, {
        isOutOfStock: !currentStatus
      });
    } catch (e) {
      alert('فشل تغيير حالة المخزون.');
    }
  };

  const executeDeleteProduct = async (productId) => {
    try {
      await deleteDoc(doc(db, 'products', productId));
    } catch (e) {
      alert('فشل حذف المنتج من قاعدة البيانات.');
    }
  };

  const handleDeleteProduct = (productId) => {
    if (Platform.OS === 'web') {
      if (window.confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
        executeDeleteProduct(productId);
      }
    } else {
      Alert.alert('تأكيد الحذف', 'هل أنت متأكد من حذف هذا المنتج؟', [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'حذف', style: 'destructive', onPress: () => executeDeleteProduct(productId) },
      ]);
    }
  };

  const handleRemoveCartItem = (cartId) => {
    setCartItems(cartItems.filter((item) => item.cartId !== cartId));
  };

  const handleClearCart = () => {
    if (cartItems.length === 0) return;
    if (Platform.OS === 'web') {
      if (window.confirm('هل أنت متأكد من رغبتك في إفراغ السلة بالكامل؟')) {
        setCartItems([]);
      }
    } else {
      Alert.alert('إفراغ السلة', 'هل أنت متأكد من رغبتك في إفراغ السلة بالكامل؟', [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'إفراغ', style: 'destructive', onPress: () => setCartItems([]) }
      ]);
    }
  };

  const handleOpenProductDetails = (product) => {
    setSelectedProduct(product);
    const defaultImg = (product.images && product.images.length > 0) ? product.images[0] : null;
    setActiveMainImage(defaultImg);
    setSelectedColor(product.colors && product.colors.length > 0 ? product.colors[0] : '');
    setSelectedSize(product.sizes && product.sizes.length > 0 ? product.sizes[0] : '');
    setQuantity(1);
  };

  const handleAddToCart = (product, qty, color, size, redirect = false) => {
    if (product.isOutOfStock) {
      alert('عذراً، هذا المنتج نفد من المخزون حالياً.');
      return;
    }

    let itemImage = null;
    if (product.colorImagesList && Array.isArray(product.colorImagesList) && color) {
      const foundStr = product.colorImagesList.find((ci) => typeof ci === 'string' && ci.startsWith(color + ':'));
      if (foundStr) {
        itemImage = foundStr.substring(color.length + 1);
      }
    }

    if (!itemImage && product.images && Array.isArray(product.images) && product.images.length > 0) {
      itemImage = String(product.images[0]);
    }

    const item = {
      cartId: String(Date.now()),
      id: String(product.id),
      name: String(product.name),
      price: Number(product.price),
      image: itemImage ? String(itemImage) : '',
      quantity: Number(qty),
      selectedColor: color ? String(color) : '',
      selectedSize: size ? String(size) : '',
    };

    setCartItems((prev) => [...prev, item]);
    setSelectedProduct(null);

    if (redirect) {
      setCurrentTab('cart');
    } else {
      alert('تمت إضافة المنتج إلى السلة!');
    }
  };

  const handleCheckout = async () => {
    let errors = {};
    if (!fullName.trim()) errors.fullName = true;
    if (!address.trim()) errors.address = true;
    if (!city.trim()) errors.city = true;
    if (!phone.trim()) errors.phone = true;
    if (!whatsapp.trim()) errors.whatsapp = true;

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      alert('يرجى ملء كافة الخانات المطلوبة.');
      return;
    }

    const now = new Date();
    const formattedDate = `${now.toLocaleDateString('en-GB')} - ${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}`;

    try {
      const cleanCartItems = cartItems.map((item) => ({
        cartId: String(item.cartId),
        id: String(item.id),
        name: String(item.name),
        price: Number(item.price),
        image: item.image ? String(item.image) : '',
        quantity: Number(item.quantity),
        selectedColor: item.selectedColor ? String(item.selectedColor) : '',
        selectedSize: item.selectedSize ? String(item.selectedSize) : '',
      }));

      const newOrder = {
        timestamp: Number(Date.now()),
        date: String(formattedDate),
        customer: {
          fullName: String(fullName),
          address: String(address),
          city: String(city),
          phone: String(phone),
          whatsapp: String(whatsapp),
        },
        items: cleanCartItems,
        subtotal: Number(subtotal),
        shipping: Number(shippingCost),
        total: Number(finalTotal),
        status: 'pending',
      };

      await addDoc(collection(db, 'orders'), newOrder);

      setCartItems([]);
      setFullName('');
      setAddress('');
      setCity('');
      setPhone('');
      setWhatsapp('');
      setFormErrors({});
      setShowSuccessModal(true);
    } catch (e) {
      console.error("خطأ إرسال الطلب:", e);
      alert('فشل إرسال الطلب، يرجى المحاولة مرة أخرى.');
    }
  };

  const handleToggleOrderStatus = async (orderId, currentStatus) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const newStatus = currentStatus === 'processed' ? 'pending' : 'processed';
      await updateDoc(orderRef, { status: newStatus });
    } catch (e) {
      alert('فشل تحديث حالة الطلب.');
    }
  };

  const executeDeleteOrder = async (orderId) => {
    try {
      await deleteDoc(doc(db, 'orders', orderId));
    } catch (e) {
      alert('فشل حذف الطلب من قاعدة البيانات.');
    }
  };

  const handleDeleteOrder = (orderId) => {
    if (Platform.OS === 'web') {
      if (window.confirm('هل تريد حذف هذا الطلب نهائياً؟')) {
        executeDeleteOrder(orderId);
      }
    } else {
      Alert.alert('تأكيد الحذف', 'هل تريد حذف هذا الطلب نهائياً؟', [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'حذف', style: 'destructive', onPress: () => executeDeleteOrder(orderId) },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. الشريط الأحمر الرئيسي */}
      <View style={styles.redHeaderBar}>
        {/* أقصى اليمين: الشعار والاسم */}
        <View style={styles.logoSection}>
          <View style={styles.logoCircleContainer}>
            <Image 
              source={LogoImage} 
              style={styles.logoImageInsideCircle} 
              resizeMode="cover" 
            />
          </View>
          <Text style={styles.brandNameText}>TOKYO</Text>
        </View>

        {/* الوسط: التنقل */}
        <View style={styles.navMenuContainer}>
          <TouchableOpacity
            style={[styles.menuBtn, currentTab === 'offers' && styles.menuBtnActive]}
            onPress={() => handleTabChange('offers')}
          >
            <Text style={[styles.menuBtnText, currentTab === 'offers' && styles.menuBtnTextActive]}>العروض</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuBtn, currentTab === 'cart' && styles.menuBtnActive]}
            onPress={() => handleTabChange('cart')}
          >
            <Text style={[styles.menuBtnText, currentTab === 'cart' && styles.menuBtnTextActive]}>
              السلة {cartItems.length > 0 && `(${cartItems.length})`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuBtn, currentTab === 'settings' && styles.menuBtnActive]}
            onPress={() => handleTabChange('settings')}
          >
            <Text style={[styles.menuBtnText, currentTab === 'settings' && styles.menuBtnTextActive]}>كود</Text>
          </TouchableOpacity>
        </View>

        {/* أقصى اليسار مع الإزاحة نحو الوسط واليسار بشكل متناسق */}
        <View style={styles.paymentNoticeSection}>
          <View style={styles.paymentNoticeBadge}>
            <Text style={styles.paymentNoticeText}>الدفع عند توصيل الطلب !</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* صفحة العروض */}
        {currentTab === 'offers' && (
          <View style={styles.page}>
            <Text style={styles.pageTitle}>أحدث العروض</Text>
            {products.length === 0 ? (
              <Text style={styles.emptyText}>لا توجد منتجات حالياً. أضف منتجات من صفحة كود أو أدخلها يدوياً.</Text>
            ) : (
              <View style={styles.productsGrid}>
                {products.map((item) => {
                  const discountLabel = formatDiscountLabel(item.discount);

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.productCard}
                      onPress={() => handleOpenProductDetails(item)}
                    >
                      <View style={styles.imageCardContainer}>
                        {item.images && item.images.length > 0 ? (
                          <Image source={{ uri: item.images[0] }} style={styles.productCardImage} />
                        ) : (
                          <View style={[styles.productCardImage, styles.noImageView]}>
                            <Text style={{ color: '#888', fontSize: 9 }}>بدون صورة</Text>
                          </View>
                        )}

                        {discountLabel !== '' && (
                          <View style={styles.discountBadge}>
                            <Text style={styles.discountBadgeText}>{discountLabel}</Text>
                          </View>
                        )}

                        {item.isOutOfStock && (
                          <View style={styles.outOfStockBadge}>
                            <Text style={styles.outOfStockBadgeText}>نفد المخزون</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.productCardTitle} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.productCardPrice}>{item.price} د.م</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* صفحة السلة */}
        {currentTab === 'cart' && (
          <View style={styles.page}>
            <View style={styles.cartHeaderRow}>
              <Text style={styles.pageTitle}>سلة التسوق</Text>
              {cartItems.length > 0 && (
                <TouchableOpacity style={styles.clearCartTopBtn} onPress={handleClearCart}>
                  <Text style={styles.clearCartTopText}>إفراغ السلة</Text>
                </TouchableOpacity>
              )}
            </View>

            {cartItems.length === 0 ? (
              <Text style={styles.emptyText}>السلة فارغة حالياً.</Text>
            ) : (
              <>
                {cartItems.map((item) => (
                  <View key={item.cartId} style={styles.cartCard}>
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={styles.cartCardImage} />
                    ) : (
                      <View style={[styles.cartCardImage, styles.noImageViewSm]} />
                    )}
                    <View style={styles.cartCardInfo}>
                      <Text style={styles.cartCardTitle}>{item.name}</Text>
                      <Text style={styles.cartCardDetails}>
                        سعر الوحدة: {item.price} د.م | الكمية: {item.quantity} 
                        {item.selectedColor ? ` | اللون: ${item.selectedColor}` : ''}
                        {item.selectedSize ? ` | المقاس: ${item.selectedSize}` : ''}
                      </Text>
                      <Text style={styles.cartCardItemTotal}>
                        المجموع الفرعي: {(item.price * item.quantity).toFixed(2)} د.م
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteCartItemBtn}
                      onPress={() => handleRemoveCartItem(item.cartId)}
                    >
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>حذف</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                <View style={styles.checkoutSection}>
                  <Text style={styles.sectionHeader}>معلومات الشحن واستلام (إلزامية)</Text>

                  <TextInput
                    style={[styles.input, formErrors.fullName && styles.inputError]}
                    placeholder="الإسم الكامل *"
                    value={fullName}
                    onChangeText={(val) => {
                      setFullName(val);
                      if (val) setFormErrors((prev) => ({ ...prev, fullName: false }));
                    }}
                  />

                  <TextInput
                    style={[styles.input, formErrors.address && styles.inputError]}
                    placeholder="العنوان *"
                    value={address}
                    onChangeText={(val) => {
                      setAddress(val);
                      if (val) setFormErrors((prev) => ({ ...prev, address: false }));
                    }}
                  />

                  <TextInput
                    style={[styles.input, formErrors.city && styles.inputError]}
                    placeholder="المدينة *"
                    value={city}
                    onChangeText={(val) => {
                      setCity(val);
                      if (val) setFormErrors((prev) => ({ ...prev, city: false }));
                    }}
                  />

                  <TextInput
                    style={[styles.input, formErrors.phone && styles.inputError]}
                    placeholder="رقم الهاتف *"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={(val) => {
                      setPhone(val);
                      if (val) setFormErrors((prev) => ({ ...prev, phone: false }));
                    }}
                  />

                  <TextInput
                    style={[styles.input, formErrors.whatsapp && styles.inputError]}
                    placeholder="رقم الواتساب *"
                    keyboardType="phone-pad"
                    value={whatsapp}
                    onChangeText={(val) => {
                      setWhatsapp(val);
                      if (val) setFormErrors((prev) => ({ ...prev, whatsapp: false }));
                    }}
                  />

                  <View style={styles.shippingInfoBox}>
                    <Text style={styles.shippingTitle}>ثمن الشحن و التوصيل</Text>
                    <Text style={styles.shippingText}>• 40 درهم لكل طلبية تقل عن 50 درهم</Text>
                    <Text style={styles.shippingText}>• 30 درهم لكل طلبية تزيد عن 50 درهم</Text>
                    <Text style={styles.shippingText}>• توصيل مجاني لكل طلبية تزيد عن 250 درهم</Text>
                  </View>

                  <View style={styles.cartSummaryBox}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryValue}>{subtotal.toFixed(2)} د.م</Text>
                      <Text style={styles.summaryLabel}>مجموع المنتجات:</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryValue}>{shippingCost === 0 ? 'مجاني' : `${shippingCost} د.م`}</Text>
                      <Text style={styles.summaryLabel}>تكلفة الشحن:</Text>
                    </View>
                    <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 6, marginTop: 3 }]}>
                      <Text style={[styles.summaryValue, { color: '#28a745', fontSize: 14 }]}>{finalTotal.toFixed(2)} د.م</Text>
                      <Text style={[styles.summaryLabel, { fontWeight: 'bold', fontSize: 13 }]}>المجموع الكلي:</Text>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
                    <Text style={styles.btnText}>إرسال الطلب (اشترِ الآن)</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}

        {/* صفحة كود (الإعدادات سابقاً) - تظهر بالكامل فقط بعد إدخال الكود الصحيح */}
        {currentTab === 'settings' && isCodeUnlocked && (
          <View style={styles.page}>
            <Text style={styles.pageTitle}>إدارة المتجر</Text>

            <View style={styles.formCard}>
              <Text style={styles.sectionHeader}>إضافة منتج جديد</Text>

              <TouchableOpacity style={styles.imagePickBtn} onPress={pickImages}>
                <Text style={styles.imagePickText}>
                  أضف الصور الأساسية
                </Text>
              </TouchableOpacity>

              {productImages.length > 0 && (
                <ScrollView horizontal style={styles.multiImagePreview}>
                  {productImages.map((uri, idx) => (
                    <Image key={idx} source={{ uri }} style={styles.previewThumb} />
                  ))}
                </ScrollView>
              )}

              <TextInput
                style={styles.input}
                placeholder="اسم المنتج (إلزامي)"
                value={productName}
                onChangeText={setProductName}
              />

              <TextInput
                style={styles.input}
                placeholder="وصف المنتج (اختياري - غير إلزامي)"
                value={productDescription}
                onChangeText={setProductDescription}
              />
              
              <TextInput
                style={styles.input}
                placeholder="السعر (إلزامي)"
                keyboardType="numeric"
                value={productPrice}
                onChangeText={setProductPrice}
              />

              <Text style={styles.labelSub}>اختر الألوان المتوفرة (اختياري):</Text>
              <View style={styles.optionsWrap}>
                {COMMON_COLORS.map((color, idx) => {
                  const isSelected = selectedColorsForNewProduct.includes(color);
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.selectChip, isSelected && styles.selectChipActive]}
                      onPress={() => toggleColorSelection(color)}
                    >
                      <Text style={isSelected ? styles.selectChipTextActive : styles.selectChipText}>{color}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {selectedColorsForNewProduct.length > 0 && (
                <View style={styles.colorImagesContainer}>
                  <Text style={styles.labelSub}>تخصيص صور للألوان المختارة (اختياري):</Text>
                  {selectedColorsForNewProduct.map((color) => (
                    <View key={color} style={styles.colorImageRow}>
                      <TouchableOpacity
                        style={styles.smallImagePickBtn}
                        onPress={() => pickImageForColor(color)}
                      >
                        <Text style={styles.imagePickText}>
                          {colorImages[color] ? `تم اختيار صورة (${color})` : `اختر صورة لون (${color})`}
                        </Text>
                      </TouchableOpacity>
                      {colorImages[color] ? (
                        <Image source={{ uri: colorImages[color] }} style={styles.tinyThumbnail} />
                      ) : null}
                    </View>
                  ))}
                </View>
              )}

              <Text style={styles.labelSub}>اختر الأحجام المتوفرة (اختياري):</Text>
              <View style={styles.optionsWrap}>
                {COMMON_SIZES.map((size, idx) => {
                  const isSelected = selectedSizesForNewProduct.includes(size);
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.selectChip, isSelected && styles.selectChipActive]}
                      onPress={() => toggleSizeSelection(size)}
                    >
                      <Text style={isSelected ? styles.selectChipTextActive : styles.selectChipText}>{size}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.formButtonsRow}>
                <TouchableOpacity style={[styles.addBtn, { flex: 2 }]} onPress={handleAddProduct}>
                  <Text style={styles.btnText}>إضافة المنتج</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.resetBtn, { flex: 1 }]} onPress={handleResetForm}>
                  <Text style={styles.btnText}>إعادة / مسح</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* المنتجات المضافة */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionHeader}>المنتجات المضافة ({products.length})</Text>
              {products.map((p) => (
                <View key={p.id} style={styles.settingProductItem}>
                  {p.images && p.images.length > 0 ? (
                    <Image source={{ uri: p.images[0] }} style={styles.miniImage} />
                  ) : (
                    <View style={[styles.miniImage, styles.noImageViewSm]} />
                  )}
                  <View style={{ flex: 1, marginRight: 6 }}>
                    <Text style={styles.boldText}>{p.name}</Text>
                    <Text style={{ fontSize: 10, color: '#28a745' }}>
                      السعر: {p.price} د.م {p.discount ? `(خصم: ${p.discount})` : ''}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.editPriceBtn}
                    onPress={() => handleOpenEditPriceModal(p)}
                  >
                    <Text style={styles.btnTextSm}>تعديل</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.stockToggleBtn,
                      p.isOutOfStock ? styles.outOfStockBtn : styles.inStockBtn
                    ]}
                    onPress={() => handleToggleStockStatus(p.id, p.isOutOfStock)}
                  >
                    <Text style={styles.btnTextSm}>
                      {p.isOutOfStock ? 'نفد' : 'متوفر'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteProductBtn}
                    onPress={() => handleDeleteProduct(p.id)}
                  >
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>حذف</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionHeader}>الطلبات الواردة ({orders.length})</Text>
              {orders.length === 0 ? (
                <Text style={styles.emptyText}>لا توجد طلبات حتى الآن.</Text>
              ) : (
                [...orders]
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .map((order) => (
                    <View key={order.id} style={[styles.orderCard, order.status === 'processed' && styles.orderCardProcessed]}>
                      <View style={styles.orderHeaderRow}>
                        <Text style={styles.orderDate}>{order.date}</Text>
                        <Text style={[styles.statusBadge, order.status === 'processed' ? styles.statusSuccess : styles.statusPending]}>
                          {order.status === 'processed' ? 'تم المعالجة بنجاح' : 'قيد الانتظار'}
                        </Text>
                      </View>

                      <Text style={styles.boldText}>العميل: {order.customer?.fullName}</Text>
                      <Text style={{ fontSize: 10 }}>الهاتف: {order.customer?.phone} | الواتساب: {order.customer?.whatsapp}</Text>
                      <Text style={{ fontSize: 10 }}>العنوان: {order.customer?.address} - {order.customer?.city}</Text>
                      <View style={styles.divider} />
                      <Text style={styles.boldText}>المنتجات:</Text>
                      {order.items && order.items.map((item, idx) => (
                        <Text key={idx} style={{ fontSize: 10, color: '#555' }}>
                          - {item.name} × {item.quantity} {item.selectedColor ? `(${item.selectedColor})` : ''} {item.selectedSize ? `[${item.selectedSize}]` : ''} ({(item.price * item.quantity).toFixed(2)} د.م)
                        </Text>
                      ))}
                      <Text style={styles.orderTotal}>مجموع المنتجات: {order.subtotal?.toFixed(2)} د.م | الشحن: {order.shipping} د.م</Text>
                      <Text style={[styles.orderTotal, { fontSize: 12, color: '#28a745' }]}>الإجمالي النهائي: {order.total?.toFixed(2)} د.م</Text>

                      <View style={styles.orderActionsRow}>
                        <TouchableOpacity
                          style={[styles.statusToggleBtn, { backgroundColor: order.status === 'processed' ? '#6c757d' : '#28a745' }]}
                          onPress={() => handleToggleOrderStatus(order.id, order.status)}
                        >
                          <Text style={styles.btnTextSm}>
                            {order.status === 'processed' ? 'إعادة لقيد الانتظار' : 'تعليم كـ تم المعالجة'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.deleteOrderBtn}
                          onPress={() => handleDeleteOrder(order.id)}
                        >
                          <Text style={styles.btnTextSm}>حذف الطلب</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* نافذة إدخال الكود السري لفتح صفحة كود */}
      <Modal animationType="fade" transparent visible={showCodeModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { padding: 20, alignItems: 'center' }]}>
            <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' }}>
              الرجاء إدخال الكود للوصول إلى صفحة كود
            </Text>

            <TextInput
              style={[styles.input, { width: '100%', textAlign: 'center', fontSize: 13 }]}
              placeholder="أدخل الكود هنا"
              secureTextEntry={true}
              value={enteredCodeInput}
              onChangeText={setEnteredCodeInput}
            />

            <View style={{ flexDirection: 'row-reverse', width: '100%', marginTop: 8, gap: 8 }}>
              <TouchableOpacity style={[styles.addBtn, { flex: 1, backgroundColor: '#28a745' }]} onPress={handleVerifyCode}>
                <Text style={styles.btnText}>دخول</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.resetBtn, { flex: 1 }]} onPress={() => { setShowCodeModal(false); setEnteredCodeInput(''); }}>
                <Text style={styles.btnText}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* زر الواتساب المدور في صفحة العروض فقط */}
      {currentTab === 'offers' && (
        <View style={styles.floatingWhatsappContainer}>
          <TouchableOpacity style={styles.floatingWhatsappBtn} onPress={openWhatsApp}>
            <Image source={WhatsappIcon} style={styles.floatingWhatsappImage} resizeMode="contain" />
          </TouchableOpacity>
        </View>
      )}

      {/* النافذة المنبثقة لتعديل السعر والخصم */}
      <Modal animationType="fade" transparent visible={!!editingProduct}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { padding: 16 }]}>
            <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 12, textAlign: 'right' }}>
              تعديل السعر والخصم: {editingProduct?.name}
            </Text>

            <Text style={{ textAlign: 'right', marginBottom: 4, fontSize: 11 }}>السعر (د.م):</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={editPriceInput}
              onChangeText={setEditPriceInput}
            />

            <Text style={{ textAlign: 'right', marginBottom: 4, fontSize: 11 }}>الخصم (للمظهر فقط):</Text>
            <TextInput
              style={styles.input}
              placeholder="مثلاً: 20 أو 20% أو تخفيض خاص"
              value={editDiscountInput}
              onChangeText={setEditDiscountInput}
            />

            <View style={{ flexDirection: 'row-reverse', marginTop: 8, gap: 8 }}>
              <TouchableOpacity style={[styles.addBtn, { flex: 1, backgroundColor: '#28a745' }]} onPress={handleSavePriceAndDiscount}>
                <Text style={styles.btnText}>حفظ التغييرات</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.resetBtn, { flex: 1 }]} onPress={() => setEditingProduct(null)}>
                <Text style={styles.btnText}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* النافذة المنبثقة للتفاصيل */}
      <Modal animationType="slide" transparent visible={!!selectedProduct}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedProduct && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.mainImageContainer}>
                  {activeMainImage ? (
                    <Image source={{ uri: activeMainImage }} style={styles.fullMainImage} />
                  ) : (
                    <View style={[styles.fullMainImage, styles.noImageView]}>
                      <Text style={{ color: '#888', fontSize: 10 }}>لا توجد صورة متاحة</Text>
                    </View>
                  )}
                  {selectedProduct.isOutOfStock && (
                    <View style={styles.modalOutOfStockBadge}>
                      <Text style={styles.outOfStockBadgeText}>نفد المخزون</Text>
                    </View>
                  )}
                </View>

                {selectedProduct.images && selectedProduct.images.length > 0 && (
                  <View style={styles.carouselContainer}>
                    <Text style={styles.imageSectionTitle}>الصور الأساسية</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row-reverse' }}>
                      {selectedProduct.images.map((uri, idx) => (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => setActiveMainImage(uri)}
                          style={[
                            styles.thumbWrapper,
                            activeMainImage === uri && styles.activeThumbWrapper
                          ]}
                        >
                          <Image source={{ uri }} style={styles.thumbImageModal} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {selectedProduct.colorImagesList && Array.isArray(selectedProduct.colorImagesList) && selectedProduct.colorImagesList.length > 0 && (
                  <View style={styles.carouselContainer}>
                    <Text style={styles.imageSectionTitle}>صور الألوان</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row-reverse' }}>
                      {selectedProduct.colorImagesList.map((itemStr, idx) => {
                        if (typeof itemStr !== 'string') return null;
                        const colonIdx = itemStr.indexOf(':');
                        if (colonIdx === -1) return null;
                        const colorName = itemStr.substring(0, colonIdx);
                        const imgUrl = itemStr.substring(colonIdx + 1);
                        if (!imgUrl) return null;

                        return (
                          <TouchableOpacity
                            key={idx}
                            onPress={() => {
                              setActiveMainImage(imgUrl);
                              setSelectedColor(colorName);
                            }}
                            style={[
                              styles.thumbWrapper,
                              activeMainImage === imgUrl && styles.activeThumbWrapper
                            ]}
                          >
                            <View style={{ alignItems: 'center' }}>
                              <Image source={{ uri: imgUrl }} style={styles.thumbImageModal} />
                              <Text style={{ fontSize: 9, color: '#555', marginTop: 2 }}>{colorName}</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                <Text style={styles.modalTitle}>{selectedProduct.name}</Text>
                
                {selectedProduct.description ? (
                  <Text style={styles.modalDescription}>{selectedProduct.description}</Text>
                ) : null}

                <Text style={styles.modalPrice}>{selectedProduct.price} د.م</Text>

                {selectedProduct.isOutOfStock && (
                  <View style={styles.outOfStockNotice}>
                    <Text style={styles.outOfStockNoticeText}>هذا المنتج غير متوفر حالياً في المخزون.</Text>
                  </View>
                )}

                {selectedProduct.colors && selectedProduct.colors.length > 0 && (
                  <View style={styles.optionSection}>
                    <Text style={styles.optionLabel}>اختر اللون:</Text>
                    <View style={styles.optionsRow}>
                      {selectedProduct.colors.map((color, i) => (
                        <TouchableOpacity
                          key={i}
                          style={[styles.chip, selectedColor === color && styles.chipSelected]}
                          onPress={() => {
                            setSelectedColor(color);
                            if (selectedProduct.colorImagesList && Array.isArray(selectedProduct.colorImagesList)) {
                              const foundStr = selectedProduct.colorImagesList.find((ci) => typeof ci === 'string' && ci.startsWith(color + ':'));
                              if (foundStr) {
                                setActiveMainImage(foundStr.substring(color.length + 1));
                              }
                            }
                          }}
                        >
                          <Text style={selectedColor === color ? styles.chipTextSelected : styles.chipText}>
                            {color}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
                  <View style={styles.optionSection}>
                    <Text style={styles.optionLabel}>اختر المقاس:</Text>
                    <View style={styles.optionsRow}>
                      {selectedProduct.sizes.map((size, i) => (
                        <TouchableOpacity
                          key={i}
                          style={[styles.chip, selectedSize === size && styles.chipSelected]}
                          onPress={() => setSelectedSize(size)}
                        >
                          <Text style={selectedSize === size ? styles.chipTextSelected : styles.chipText}>
                            {size}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {!selectedProduct.isOutOfStock && (
                  <View style={styles.optionSection}>
                    <Text style={styles.optionLabel}>الكمية:</Text>
                    <View style={styles.quantityRow}>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(Math.max(1, quantity - 1))}>
                        <Text style={styles.qtyBtnText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{quantity}</Text>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(quantity + 1)}>
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: selectedProduct.isOutOfStock ? '#ccc' : '#28a745' }]}
                    disabled={selectedProduct.isOutOfStock}
                    onPress={() => handleAddToCart(selectedProduct, quantity, selectedColor, selectedSize, true)}
                  >
                    <Text style={styles.btnText}>
                      {selectedProduct.isOutOfStock ? 'نفد المخزون' : 'اشترِ الآن'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: selectedProduct.isOutOfStock ? '#ccc' : '#007AFF' }]}
                    disabled={selectedProduct.isOutOfStock}
                    onPress={() => handleAddToCart(selectedProduct, quantity, selectedColor, selectedSize, false)}
                  >
                    <Text style={styles.btnText}>
                      {selectedProduct.isOutOfStock ? 'غير متوفر' : 'إضافة إلى السلة'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedProduct(null)}>
                  <Text style={{ textAlign: 'center', color: '#666', fontWeight: 'bold', fontSize: 11 }}>إغلاق</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent visible={showSuccessModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { padding: 24, alignItems: 'center' }]}>
            <Text style={{ fontSize: 17, fontWeight: 'bold', marginVertical: 8, textAlign: 'center' }}>
              تم استلام طلبك بنجاح!
            </Text>
            <Text style={{ fontSize: 11, color: '#666', textAlign: 'center', marginBottom: 16, lineHeight: 18 }}>
              شكرا لتسوقك معنا....سيتم معالجة طلبك في أقرب وقت ممكن !
            </Text>
            <TouchableOpacity style={[styles.addBtn, { paddingHorizontal: 24 }]} onPress={() => setShowSuccessModal(false)}>
              <Text style={styles.btnText}>حسناً</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8', position: 'relative' },

  // 1. تنسيق الشريط الأحمر الرئيسي
  redHeaderBar: {
    backgroundColor: '#C8102E',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  
  // قسم اللوجو والاسم (في أقصى اليمين)
  logoSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    flex: 1,
  },
  logoCircleContainer: {
    width: 29,
    height: 29,
    borderRadius: 14.5,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: '#ffffff',
  },
  logoImageInsideCircle: {
    width: '100%',
    height: '100%',
  },
  brandNameText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 1,
  },

  // قسم القائمة التنقلية (في الوسط)
  navMenuContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    flex: 2,
  },
  menuBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  menuBtnActive: {
    backgroundColor: '#ffffff',
  },
  menuBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  menuBtnTextActive: {
    color: '#C8102E',
    fontWeight: 'bold',
  },

  // قسم الدفع عند التوصيل مع إزاحة متناسقة لليسار والوسط
  paymentNoticeSection: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1.2,
    marginLeft: 4,
  },
  paymentNoticeBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  paymentNoticeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // حاوية زر الواتساب الثابت
  floatingWhatsappContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    zIndex: 999,
  },
  // زر الواتساب العائم المدور بدون ظل وبدون تأثيرات
  floatingWhatsappBtn: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  floatingWhatsappImage: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
  },

  content: { flex: 1, padding: 12 },
  page: { paddingBottom: 32 },
  pageTitle: { fontSize: 17, fontWeight: 'bold', textAlign: 'right', marginBottom: 12, color: '#333' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 24, fontSize: 13 },

  cartHeaderRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  clearCartTopBtn: { backgroundColor: '#dc3545', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5 },
  clearCartTopText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  formCard: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 16, elevation: 2 },
  sectionHeader: { fontSize: 14, fontWeight: 'bold', textAlign: 'right', marginBottom: 10, color: '#222' },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
    textAlign: 'right',
    fontSize: 11,
  },
  inputError: {
    borderColor: '#dc3545',
    backgroundColor: '#fff8f8',
    borderWidth: 1.2,
  },
  imagePickBtn: {
    backgroundColor: '#e9ecef',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderStyle: 'dashed',
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  imagePickText: { color: '#495057', fontWeight: '600', fontSize: 10, textAlign: 'center' },
  multiImagePreview: { flexDirection: 'row-reverse', marginBottom: 8 },
  previewThumb: { width: 48, height: 48, borderRadius: 5, marginLeft: 6, resizeMode: 'cover' },
  colorImagesContainer: { backgroundColor: '#f8f9fa', padding: 8, borderRadius: 6, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  colorImageRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 6, gap: 8 },
  smallImagePickBtn: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc', borderStyle: 'dashed', borderRadius: 5, padding: 6, alignItems: 'center' },
  tinyThumbnail: { width: 32, height: 32, borderRadius: 5, resizeMode: 'cover' },

  noImageView: { backgroundColor: '#e9ecef', justifyContent: 'center', alignItems: 'center' },
  noImageViewSm: { backgroundColor: '#e9ecef', width: 32, height: 32, borderRadius: 3 },
  labelSub: { fontSize: 11, fontWeight: 'bold', textAlign: 'right', marginBottom: 5, color: '#555' },
  optionsWrap: { flexDirection: 'row-reverse', flexWrap: 'wrap', marginBottom: 10 },
  selectChip: {
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 5,
    marginBottom: 5,
    backgroundColor: '#fff',
  },
  selectChipActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  selectChipText: { fontSize: 10, color: '#333' },
  selectChipTextActive: { fontSize: 10, color: '#fff', fontWeight: 'bold' },
  
  formButtonsRow: { flexDirection: 'row-reverse', gap: 8, marginTop: 4 },
  addBtn: { backgroundColor: '#007AFF', padding: 10, borderRadius: 6, alignItems: 'center' },
  resetBtn: { backgroundColor: '#66757d', padding: 10, borderRadius: 6, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },

  productsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between' },
  productCard: {
    backgroundColor: '#fff',
    width: '31.5%',
    borderRadius: 6,
    padding: 5,
    marginBottom: 10,
    alignItems: 'center',
    elevation: 2,
    overflow: 'hidden',
  },
  imageCardContainer: { width: '100%', height: 88, position: 'relative', backgroundColor: '#fcfcfc', borderRadius: 5, overflow: 'hidden' },
  productCardImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  
  discountBadge: {
    position: 'absolute',
    top: 3,
    left: 3,
    backgroundColor: '#ff7d00',
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 3,
    elevation: 2,
  },
  discountBadgeText: { color: '#ffffff', fontSize: 7, fontWeight: 'bold' },

  outOfStockBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    backgroundColor: 'rgba(220, 53, 69, 0.95)',
    paddingHorizontal: 3,
    paddingVertical: 1.5,
    borderRadius: 2,
  },
  modalOutOfStockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(220, 53, 69, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  outOfStockBadgeText: { color: '#fff', fontSize: 8, fontWeight: 'bold' },
  outOfStockNotice: { backgroundColor: '#f8d7da', padding: 6, borderRadius: 5, marginBottom: 10, borderWidth: 1, borderColor: '#f5c6cb' },
  outOfStockNoticeText: { color: '#721c24', fontSize: 10, fontWeight: 'bold', textAlign: 'center' },

  productCardTitle: { fontSize: 10, fontWeight: 'bold', marginTop: 5, textAlign: 'center', width: '100%' },
  productCardPrice: { fontSize: 9.5, color: '#28a745', fontWeight: 'bold', marginTop: 2 },

  cartCard: {
    flexDirection: 'row-reverse',
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
    alignItems: 'center',
  },
  cartCardImage: { width: 48, height: 48, borderRadius: 5 },
  cartCardInfo: { flex: 1, marginRight: 8, alignItems: 'flex-end' },
  cartCardTitle: { fontSize: 13, fontWeight: 'bold' },
  cartCardDetails: { fontSize: 9.5, color: '#666', marginVertical: 2 },
  cartCardItemTotal: { fontSize: 10, color: '#28a745', fontWeight: 'bold' },
  deleteCartItemBtn: { backgroundColor: '#dc3545', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 5 },

  checkoutSection: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginTop: 12 },
  
  shippingInfoBox: { backgroundColor: '#f8f9fa', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#e9ecef', marginVertical: 10 },
  shippingTitle: { fontSize: 12, fontWeight: 'bold', textAlign: 'right', marginBottom: 5, color: '#333' },
  shippingText: { fontSize: 10, color: '#555', textAlign: 'right', marginBottom: 2 },

  cartSummaryBox: { backgroundColor: '#f1f3f5', padding: 10, borderRadius: 6, marginBottom: 12 },
  summaryRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 5 },
  summaryLabel: { fontSize: 11, color: '#495057' },
  summaryValue: { fontSize: 12, fontWeight: 'bold', color: '#212529' },

  checkoutBtn: { backgroundColor: '#28a745', padding: 11, borderRadius: 6, alignItems: 'center', marginTop: 4 },

  sectionContainer: { marginTop: 12 },
  settingProductItem: {
    flexDirection: 'row-reverse',
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
    alignItems: 'center',
    gap: 5,
  },
  editPriceBtn: { backgroundColor: '#17a2b8', paddingHorizontal: 6, paddingVertical: 5, borderRadius: 5 },
  stockToggleBtn: { paddingHorizontal: 6, paddingVertical: 5, borderRadius: 5 },
  inStockBtn: { backgroundColor: '#28a745' },
  outOfStockBtn: { backgroundColor: '#ffc107' },
  deleteProductBtn: { backgroundColor: '#dc3545', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 5 },
  miniImage: { width: 32, height: 32, borderRadius: 3 },
  boldText: { fontWeight: 'bold', textAlign: 'right', fontSize: 11 },
  orderCard: { backgroundColor: '#fff', padding: 10, borderRadius: 6, marginBottom: 10, borderRightWidth: 3, borderRightColor: '#ffc107', elevation: 2 },
  orderCardProcessed: { borderRightColor: '#28a745', backgroundColor: '#f8fff9' },
  orderHeaderRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  orderDate: { fontSize: 9.5, color: '#888' },
  statusBadge: { fontSize: 9.5, fontWeight: 'bold', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 10 },
  statusPending: { backgroundColor: '#fff3cd', color: '#856404' },
  statusSuccess: { backgroundColor: '#d4edda', color: '#155724' },
  orderTotal: { marginTop: 3, fontWeight: 'bold', color: '#555', textAlign: 'right', fontSize: 10 },
  divider: { height: 0.8, backgroundColor: '#eee', marginVertical: 5 },
  orderActionsRow: { flexDirection: 'row-reverse', gap: 8, marginTop: 8 },
  statusToggleBtn: { flex: 1, backgroundColor: '#28a745', padding: 6, borderRadius: 5, alignItems: 'center' },
  deleteOrderBtn: { backgroundColor: '#dc3545', padding: 6, borderRadius: 5, alignItems: 'center' },
  btnTextSm: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 12 },
  modalContent: { backgroundColor: '#fff', borderRadius: 10, padding: 12, maxHeight: '90%' },
  
  mainImageContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    marginBottom: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  fullMainImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },

  carouselContainer: { marginBottom: 10 },
  imageSectionTitle: { fontSize: 11, fontWeight: 'bold', color: '#222', textAlign: 'right', marginBottom: 5 },
  thumbWrapper: {
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: 6,
    marginLeft: 5,
    padding: 1,
    alignItems: 'center',
  },
  activeThumbWrapper: {
    borderColor: '#007AFF',
  },
  thumbImageModal: { width: 44, height: 44, borderRadius: 5, resizeMode: 'cover' },

  modalTitle: { fontSize: 16, fontWeight: 'bold', textAlign: 'right', color: '#222', marginTop: 4 },
  modalDescription: { fontSize: 11, color: '#555', textAlign: 'right', marginTop: 5, marginBottom: 6, lineHeight: 16 },
  modalPrice: { fontSize: 14, color: '#28a745', fontWeight: 'bold', textAlign: 'right', marginBottom: 10 },
  optionSection: { marginBottom: 10, alignItems: 'flex-end' },
  optionLabel: { fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
  optionsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap' },
  chip: { borderBottomWidth: 1, borderColor: '#ccc', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 13, marginLeft: 6, marginBottom: 4 },
  chipSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  chipText: { color: '#333', fontSize: 10 },
  chipTextSelected: { color: '#fff', fontWeight: 'bold', fontSize: 10 },
  quantityRow: { flexDirection: 'row-reverse', alignItems: 'center' },
  qtyBtn: { backgroundColor: '#ddd', width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { fontSize: 14, fontWeight: 'bold' },
  qtyText: { marginHorizontal: 12, fontSize: 13, fontWeight: 'bold' },
  modalButtons: { marginTop: 12, gap: 8 },
  actionBtn: { padding: 10, borderRadius: 6, alignItems: 'center' },
  closeBtn: { marginTop: 8, padding: 8 },
});