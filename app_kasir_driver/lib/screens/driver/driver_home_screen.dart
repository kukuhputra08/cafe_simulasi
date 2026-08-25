import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:async';
import '../../main.dart';

class DriverHomeScreen extends StatefulWidget {
  const DriverHomeScreen({super.key});

  @override
  State<DriverHomeScreen> createState() => _DriverHomeScreenState();
}

class _DriverHomeScreenState extends State<DriverHomeScreen> {
  List<Map<String, dynamic>> orders = [];
  bool loading = true;
  String? trackingOrderId;
  Timer? locationTimer;

  final statusLabels = {
    'siap_diantar': 'Siap Diambil',
    'diambil_driver': 'Sudah Diambil',
    'dalam_perjalanan': 'Dalam Perjalanan',
  };

  @override
  void initState() {
    super.initState();
    fetchOrders();
    supabase
        .channel('driver-orders')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'orders',
          callback: (payload) => fetchOrders(),
        )
        .subscribe();
  }

  @override
  void dispose() {
    locationTimer?.cancel();
    super.dispose();
  }

  Future<void> fetchOrders() async {
    final myId = supabase.auth.currentUser!.id;
    final res = await supabase
        .from('orders')
        .select('id, invoice_no, customer_name, customer_phone, delivery_address, delivery_lat, delivery_lng, total, status')
        .eq('driver_id', myId)
        .inFilter('status', ['siap_diantar', 'diambil_driver', 'dalam_perjalanan'])
        .order('created_at');

    setState(() {
      orders = List<Map<String, dynamic>>.from(res);
      loading = false;
    });
  }

  String? nextStatus(String current) {
    switch (current) {
      case 'siap_diantar':
        return 'diambil_driver';
      case 'diambil_driver':
        return 'dalam_perjalanan';
      case 'dalam_perjalanan':
        return 'selesai';
      default:
        return null;
    }
  }

  Future<void> updateStatus(String orderId, String newStatus) async {
    await supabase.from('orders').update({'status': newStatus}).eq('id', orderId);
    await supabase.from('order_status_history').insert({
      'order_id': orderId,
      'status': newStatus,
      'changed_by': supabase.auth.currentUser!.id,
    });

    if (newStatus == 'selesai') {
      stopSharingLocation();
    }
    fetchOrders();
  }

  Future<void> startSharingLocation(String orderId) async {
    // minta izin lokasi
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Izin lokasi ditolak')),
          );
        }
        return;
      }
    }

    setState(() => trackingOrderId = orderId);

    // kirim posisi pertama langsung
    await sendLocation(orderId);

    // lalu kirim berkala tiap 10 detik
    locationTimer?.cancel();
    locationTimer = Timer.periodic(const Duration(seconds: 10), (_) => sendLocation(orderId));
  }

  Future<void> sendLocation(String orderId) async {
    try {
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      final myId = supabase.auth.currentUser!.id;

      await supabase.from('driver_locations').upsert(
        {
          'driver_id': myId,
          'order_id': orderId,
          'lat': pos.latitude,
          'lng': pos.longitude,
          'updated_at': DateTime.now().toIso8601String(),
        },
        onConflict: 'driver_id,order_id',
      );
    } catch (e) {
      debugPrint('Gagal kirim lokasi: $e');
    }
  }

  void stopSharingLocation() {
    locationTimer?.cancel();
    setState(() => trackingOrderId = null);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Driver'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              stopSharingLocation();
              await supabase.auth.signOut();
              if (context.mounted) Navigator.popUntil(context, (r) => r.isFirst);
            },
          ),
        ],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : orders.isEmpty
              ? const Center(child: Text('Belum ada pesanan yang di-assign ke kamu'))
              : RefreshIndicator(
                  onRefresh: fetchOrders,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: orders.length,
                    itemBuilder: (context, index) {
                      final order = orders[index];
                      final status = order['status'] as String;
                      final next = nextStatus(status);
                      final isTracking = trackingOrderId == order['id'];
                      final canShareLocation = status == 'diambil_driver' || status == 'dalam_perjalanan';

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
                              const SizedBox(height: 4),
                              Text('Pembeli: ${order['customer_name'] ?? '-'}'),
                              Text('WA: ${order['customer_phone'] ?? '-'}'),
                              if (order['delivery_address'] != null)
                                Text('Alamat: ${order['delivery_address']}'),
                              const SizedBox(height: 8),
                              Text('Total: Rp${order['total']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                              const SizedBox(height: 12),

                              if (canShareLocation)
                                SizedBox(
                                  width: double.infinity,
                                  child: OutlinedButton.icon(
                                    icon: Icon(isTracking ? Icons.location_on : Icons.location_off),
                                    label: Text(isTracking ? 'Berbagi Lokasi (aktif)' : 'Mulai Bagikan Lokasi'),
                                    onPressed: isTracking
                                        ? stopSharingLocation
                                        : () => startSharingLocation(order['id']),
                                  ),
                                ),
                              const SizedBox(height: 8),

                              if (next != null)
                                SizedBox(
                                  width: double.infinity,
                                  child: FilledButton(
                                    onPressed: () => updateStatus(order['id'], next),
                                    child: Text('Update → ${statusLabels[next] ?? next}'),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}