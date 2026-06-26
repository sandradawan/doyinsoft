import 'package:flutter/material.dart';

import '../api.dart';
import '../theme.dart';

/// A single quick-add row: name + price + currency + type. Details (image,
/// description, download link) are added later by editing the product.
class _Row {
  final name = TextEditingController();
  final price = TextEditingController();
  String currency = 'NGN';
  String type = 'physical';
  void dispose() {
    name.dispose();
    price.dispose();
  }
}

/// Add several products at once — one lightweight row each, submitted together.
class QuickAddScreen extends StatefulWidget {
  const QuickAddScreen({super.key});
  @override
  State<QuickAddScreen> createState() => _QuickAddScreenState();
}

class _QuickAddScreenState extends State<QuickAddScreen> {
  final List<_Row> _rows = [_Row(), _Row(), _Row()];
  bool _saving = false;

  @override
  void dispose() {
    for (final r in _rows) {
      r.dispose();
    }
    super.dispose();
  }

  void _addRow() => setState(() => _rows.add(_Row()));

  void _removeRow(int i) {
    if (_rows.length <= 1) return;
    setState(() {
      _rows[i].dispose();
      _rows.removeAt(i);
    });
  }

  Future<void> _submit() async {
    final items = _rows
        .where((r) => r.name.text.trim().isNotEmpty)
        .map((r) => {
              'name': r.name.text.trim(),
              'price': double.tryParse(r.price.text.trim()) ?? 0,
              'currency': r.currency,
              'product_type': r.type,
            })
        .toList();
    if (items.isEmpty) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Enter at least one product name.')));
      return;
    }
    setState(() => _saving = true);
    ({int created, List<String> skipped}) res;
    try {
      res = await Api.instance.bulkAddProducts(items);
    } catch (e) {
      debugPrint('[QuickAdd] $e');
      res = (created: 0, skipped: <String>[]);
    }
    if (!mounted) return;
    setState(() => _saving = false);
    if (res.created == 0) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Could not add the products. Try again.')));
      return;
    }
    final msg = res.skipped.isEmpty
        ? '${res.created} product${res.created == 1 ? '' : 's'} added — sent for review.'
        : '${res.created} added, ${res.skipped.length} skipped.';
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
    Navigator.pop(context, true);
  }

  int get _filled => _rows.where((r) => r.name.text.trim().isNotEmpty).length;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Quick add'),
        actions: [
          TextButton.icon(
            onPressed: _addRow,
            icon: const Icon(Icons.add),
            label: const Text('Row'),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: FilledButton(
            onPressed: _saving ? null : _submit,
            style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
            child: _saving
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                : Text(_filled > 0 ? 'Add all ($_filled)' : 'Add all'),
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(4, 0, 4, 10),
            child: Text(
              'Add the basics for each item now; tap a product later to add its photo, description and (for digital items) a download link.',
              style: TextStyle(fontSize: 12, color: context.brand.inkSoft),
            ),
          ),
          ...List.generate(_rows.length, (i) => _rowCard(i)),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: _addRow,
            icon: const Icon(Icons.add),
            label: const Text('Add another'),
          ),
        ],
      ),
    );
  }

  Widget _rowCard(int i) {
    final r = _rows[i];
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.fromLTRB(12, 10, 8, 12),
      decoration: BoxDecoration(
        color: context.brand.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.brand.line),
      ),
      child: Column(
        children: [
          Row(children: [
            Text('${i + 1}', style: TextStyle(color: context.brand.inkSoft, fontWeight: FontWeight.w700)),
            const SizedBox(width: 8),
            Expanded(
              child: TextField(
                controller: r.name,
                textCapitalization: TextCapitalization.words,
                onChanged: (_) => setState(() {}),
                decoration: const InputDecoration(
                    hintText: 'Product name', border: InputBorder.none, isDense: true),
              ),
            ),
            IconButton(
              visualDensity: VisualDensity.compact,
              onPressed: _rows.length > 1 ? () => _removeRow(i) : null,
              icon: Icon(Icons.close, size: 18, color: context.brand.inkSoft),
            ),
          ]),
          const Divider(height: 14),
          Row(children: [
            SizedBox(
              width: 90,
              child: TextField(
                controller: r.price,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                    labelText: 'Price', isDense: true, border: OutlineInputBorder()),
              ),
            ),
            const SizedBox(width: 8),
            _miniDropdown(r.currency, const ['NGN', 'USD'], (v) => setState(() => r.currency = v)),
            const SizedBox(width: 8),
            Expanded(
              child: _miniDropdown(r.type, const ['physical', 'digital', 'service'],
                  (v) => setState(() => r.type = v),
                  labels: const {'physical': 'Physical', 'digital': 'Digital', 'service': 'Service'}),
            ),
          ]),
        ],
      ),
    );
  }

  Widget _miniDropdown(String value, List<String> options, ValueChanged<String> onChanged,
      {Map<String, String>? labels}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        border: Border.all(color: context.brand.line),
        borderRadius: BorderRadius.circular(6),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: value,
          isDense: true,
          items: options
              .map((o) => DropdownMenuItem(value: o, child: Text(labels?[o] ?? o)))
              .toList(),
          onChanged: (v) => v == null ? null : onChanged(v),
        ),
      ),
    );
  }
}
