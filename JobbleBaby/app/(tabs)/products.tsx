import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Product {
  id: string;
  name: string;
  emoji: string;
  price: string;
  rating: number;
  description: string;
}

interface Category {
  id: string;
  name: string;
  emoji: string;
  products: Product[];
}

const CATEGORIES: Category[] = [
  {
    id: 'essentials',
    name: 'Essentials',
    emoji: '🛍️',
    products: [
      { id: '1', name: 'Premium Diapers', emoji: '🧷', price: '$29.99', rating: 4.8, description: 'Hypoallergenic, 12-hour leak protection' },
      { id: '2', name: 'Baby Wipes', emoji: '🧻', price: '$12.99', rating: 4.6, description: 'Fragrance-free, 99.9% natural' },
      { id: '3', name: 'Diaper Cream', emoji: '🧴', price: '$8.99', rating: 4.7, description: 'Zinc oxide formula, gentle on skin' },
    ],
  },
  {
    id: 'feeding',
    name: 'Feeding',
    emoji: '🍼',
    products: [
      { id: '4', name: 'Anti-Colic Bottles', emoji: '🍼', price: '$34.99', rating: 4.9, description: 'Vent system prevents gas and fussiness' },
      { id: '5', name: 'Silicone Bibs', emoji: '🍽️', price: '$15.99', rating: 4.5, description: 'Easy-clean, food-grade silicone' },
      { id: '6', name: 'Baby Food Maker', emoji: '🥄', price: '$49.99', rating: 4.8, description: 'Steam, blend, and warm in one device' },
    ],
  },
  {
    id: 'sleep',
    name: 'Sleep',
    emoji: '🌙',
    products: [
      { id: '7', name: 'Sleep Sack', emoji: '👶', price: '$32.99', rating: 4.7, description: 'TOG 1.0, cotton fleece, safe zip' },
      { id: '8', name: 'White Noise Machine', emoji: '🔊', price: '$24.99', rating: 4.6, description: '32 soothing sounds, timer function' },
      { id: '9', name: 'Baby Monitor HD', emoji: '📹', price: '$89.99', rating: 4.9, description: '1080p camera, night vision, two-way audio' },
    ],
  },
  {
    id: 'health',
    name: 'Health',
    emoji: '💊',
    products: [
      { id: '10', name: 'Nose Frida', emoji: '👃', price: '$19.99', rating: 4.8, description: 'Doctor-designed, saline drops included' },
      { id: '11', name: 'Bath Thermometer', emoji: '🌡️', price: '$14.99', rating: 4.5, description: 'LED display, accurate to 0.1°' },
      { id: '12', name: 'Baby First Aid Kit', emoji: '🩹', price: '$26.99', rating: 4.7, description: '45 pieces, BPA-free containers' },
    ],
  },
  {
    id: 'clothing',
    name: 'Clothing',
    emoji: '👕',
    products: [
      { id: '13', name: 'Onesie 5-Pack', emoji: '👶', price: '$38.99', rating: 4.6, description: '100% organic cotton, snap buttons' },
      { id: '14', name: 'Sleep & Play', emoji: '🧸', price: '$25.99', rating: 4.8, description: 'Zipped, footed, tagless comfort' },
      { id: '15', name: 'Socks 6-Pack', emoji: '🧦', price: '$16.99', rating: 4.5, description: 'Non-slip grip, stretch fit' },
    ],
  },
];

const renderStars = (rating: number) => {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  return '★'.repeat(full) + (half ? '½' : '') + ` (${rating})`;
};

export default function ProductsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Trusted</Text>
          <Text style={styles.title}>Baby Products</Text>
          <Text style={styles.subtitle}>Curated recommendations for your little one</Text>
        </View>

        {CATEGORIES.map((category) => (
          <View key={category.id} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryEmoji}>{category.emoji}</Text>
              <Text style={styles.categoryName}>{category.name}</Text>
            </View>
            {category.products.map((product) => (
              <TouchableOpacity key={product.id} style={styles.productCard} activeOpacity={0.7}>
                <Text style={styles.productEmoji}>{product.emoji}</Text>
                <View style={styles.productInfo}>
                  <View style={styles.productHeader}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productPrice}>{product.price}</Text>
                  </View>
                  <Text style={styles.productRating}>{renderStars(product.rating)}</Text>
                  <Text style={styles.productDescription}>{product.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a1628' },
  container: { flex: 1, backgroundColor: '#0a1628' },
  content: { padding: 20, paddingBottom: 100 },
  header: { marginBottom: 24 },
  greeting: { fontSize: 14, color: '#8b9bb4', textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginTop: 4 },
  subtitle: { fontSize: 14, color: '#8b9bb4', marginTop: 8 },
  categorySection: { marginBottom: 24 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  categoryEmoji: { fontSize: 20, marginRight: 8 },
  categoryName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  productCard: {
    backgroundColor: '#1a2a3a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a3a4a',
    flexDirection: 'row',
    alignItems: 'center',
  },
  productEmoji: { fontSize: 32, marginRight: 16 },
  productInfo: { flex: 1 },
  productHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productName: { fontSize: 16, fontWeight: '600', color: '#fff', flex: 1 },
  productPrice: { fontSize: 16, fontWeight: '600', color: '#3B82F6' },
  productRating: { fontSize: 12, color: '#f39c12', marginTop: 4 },
  productDescription: { fontSize: 13, color: '#8b9bb4', marginTop: 4 },
});