import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../main.dart';

class OnlineOrdersTab extends StatefulWidget {
  const OnlineOrdersTab({super.key});

  @override
  State<OnlineOrdersTab> createState() => _OnlineOrdersTabState();
}

class _OnlineOrdersTabState extends State<OnlineOrdersTab> {
  List<Map<String, dynamic>> orders = [];
  bool loading = true;

  final activeStatuses = ['dibayar', 'disiapkan', 'siap_diantar', 'diambil_driver', 'dalam_perjalanan'];

  final statusLabels = {
    'dibayar': 'Pesanan Baru',
    'disiapkan': 'Disiapkan',
    'siap_diantar': 'Siap Diantar',
    'diambil_driver': 'Diambil Driver',
    'dalam_perjalanan': 'Dalam Perjalanan',
  };

  @override
  void initState() {
    super.initState();
    fetchOrders();
    // realtime: refresh list tiap ada perubahan di tabel orders
    supabase
        .channel('cashier-online-orders')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'orders',
          callback: (payload) => fetchOrders(),
        )
        .subscribe();
  }

  Future<void> fetchOrders() async {
    final res = await supabase
        .from('orders')
        .select('id, invoice_no, customer_name, customer_phone, total, status, order_items(qty, menu_items(name))')
        .eq('type', 'online')
        .inFilter('status', activeStatuses)
        .order('created_at');

    setState(() {
      orders = List<Map<String, dynamic>>.from(res);
      loading = false;
    });
  }

  String? nextStatus(String current) {
    switch (current) {
      case 'dibayar':
        return 'disiapkan';
      case 'disiapkan':
        return 'siap_diantar';
      default:
        return null; // siap_diantar ke atas itu tanggung jawab driver
    }
  }

  Future<void> updateStatus(String orderId, String newStatus) async {
    await supabase.from('orders').update({'status': newStatus}).eq('id', orderId);
    await supabase.from('order_status_history').insert({
      'order_id': orderId,
      'status': newStatus,
      'changed_by': supabase.auth.currentUser!.id,
    });
    fetchOrders();
  }

  Future<void> assignDriver(String orderId) async {
    final drivers = await supabase.from('profiles').select('id, full_name').eq('role', 'driver');

    if (drivers.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Belum ada akun driver yang terdaftar')),
        );
      }
      return;
    }

    if (!mounted) return;
    final selected = await showDialog<String>(
      context: context,
      builder: (_) => SimpleDialog(
        title: const Text('Pilih Driver'),
        children: drivers.map<Widget>((d) {
          return SimpleDialogOption(
            onPressed: () => Navigator.pop(context, d['id'] as String),
            child: Text(d['full_name'] ?? '-'),
          );
        }).toList(),
      ),
    );

    if (selected != null) {
      await supabase.from('orders').update({
        'driver_id': selected,
        'status': 'siap_diantar',
      }).eq('id', orderId);
      fetchOrders();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return const Center(child: CircularProgressIndicator());
    if (orders.isEmpty) return const Center(child: Text('Belum ada pesanan online'));

    return RefreshIndicator(
      onRefresh: fetchOrders,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: orders.length,
        itemBuilder: (context, index) {
          final order = orders[index];
          final items = List<Map<String, dynamic>>.from(order['order_items'] ?? []);
          final status = order['status'] as String;
          final next = nextStatus(status);

          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(order['invoice_no'], style: const TextStyle(fontWeight: FontWeight.bold)),
                      Chip(label: Text(statusLabels[status] ?? status)),
                    ],
                  ),
                  Text(order['customer_name'] ?? '-'),
                  const SizedBox(height: 8),
                  ...items.map((i) => Text('- ${i['menu_items']?['name'] ?? '-'} x${i['qty']}')),
                  const SizedBox(height: 8),
                  Text('Total: Rp${order['total']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  if (status == 'siap_diantar')
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        icon: const Icon(Icons.delivery_dining),
                        label: const Text('Assign Driver'),
                        onPressed: () => assignDriver(order['id']),
                      ),
                    )
                  else if (next != null)
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: () => updateStatus(order['id'], next),
                        child: Text('Proses → ${statusLabels[next]}'),
                      ),
                    ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}