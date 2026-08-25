import 'package:flutter/material.dart';
import 'online_orders_tab.dart';
import 'offline_order_tab.dart';
import '../../main.dart';

class CashierHomeScreen extends StatelessWidget {
  const CashierHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Kasir'),
          actions: [
            IconButton(
              icon: const Icon(Icons.logout),
              onPressed: () async {
                await supabase.auth.signOut();
                if (context.mounted) Navigator.popUntil(context, (r) => r.isFirst);
              },
            ),
          ],
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Online', icon: Icon(Icons.wifi)),
              Tab(text: 'Offline', icon: Icon(Icons.storefront)),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            OnlineOrdersTab(),
            OfflineOrderTab(),
          ],
        ),
      ),
    );
  }
}