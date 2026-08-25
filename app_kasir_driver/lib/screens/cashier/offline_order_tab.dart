import 'package:flutter/material.dart';
import '../../main.dart';

class OfflineOrderTab extends StatefulWidget {
  const OfflineOrderTab({super.key});

  @override
  State<OfflineOrderTab> createState() => _OfflineOrderTabState();
}

class _OfflineOrderTabState extends State<OfflineOrderTab> {
  List<Map<String, dynamic>> menuItems = [];
  Map<String, int> cart = {}; // menuItemId -> qty
  bool loading = true;
  bool submitting = false;

  @override
  void initState() {
    super.initState();
    fetchMenu();
  }

  Future<void> fetchMenu() async {
    final res = await supabase
        .from('menu_items')
        .select('id, name, price')
        .eq('is_active', true)
        .order('name');

    setState(() {
      menuItems = List<Map<String, dynamic>>.from(res);
      loading = false;
    });
  }

  void changeQty(String menuItemId, int delta) {
    setState(() {
      final current = cart[menuItemId] ?? 0;
      final updated = current + delta;
      if (updated <= 0) {
        cart.remove(menuItemId);
      } else {
        cart[menuItemId] = updated;
      }
    });
  }

  num get total {
    num sum = 0;
    for (final item in menuItems) {
      final qty = cart[item['id']] ?? 0;
      sum += (item['price'] as num) * qty;
    }
    return sum;
  }

  Future<void> submitOrder() async {
    if (cart.isEmpty) return;
    setState(() => submitting = true);

    try {
      final items = cart.entries
          .map((e) => {'menu_item_id': e.key, 'qty': e.value})
          .toList();

      final res = await supabase.rpc('create_offline_order', params: {'p_items': items});
      final result = (res as List).first;

      if (mounted) {
        showDialog(
          context: context,
          builder: (_) => AlertDialog(
            title: const Text('Pesanan Berhasil'),
            content: Text('Invoice: ${result['invoice_no']}\nTotal: Rp${result['total']}'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('OK'),
              ),
            ],
          ),
        );
      }

      setState(() => cart.clear());
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal buat pesanan: $e')),
        );
      }
    } finally {
      setState(() => submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return const Center(child: CircularProgressIndicator());

    return Column(
      children: [
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: menuItems.length,
            itemBuilder: (context, index) {
              final item = menuItems[index];
              final qty = cart[item['id']] ?? 0;

              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  title: Text(item['name']),
                  subtitle: Text('Rp${item['price']}'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.remove_circle_outline),
                        onPressed: qty > 0 ? () => changeQty(item['id'], -1) : null,
                      ),
                      Text('$qty', style: const TextStyle(fontSize: 16)),
                      IconButton(
                        icon: const Icon(Icons.add_circle_outline),
                        onPressed: () => changeQty(item['id'], 1),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        if (cart.isNotEmpty)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              border: Border(top: BorderSide(color: Colors.grey.shade300)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    'Total: Rp$total',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                ),
                FilledButton(
                  onPressed: submitting ? null : submitOrder,
                  child: submitting
                      ? const SizedBox(
                          width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('Buat Pesanan'),
                ),
              ],
            ),
          ),
      ],
    );
  }
}